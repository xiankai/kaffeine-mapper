import { place } from "../../test/fixtures";
import {
  enrichPlaces,
  needsEnrichment,
  MATCHER_VERSION,
  OVERPASS_URLS,
  sleep,
} from "../overpass";

const ok = (elements: unknown[]) =>
  ({ ok: true, status: 200, json: async () => ({ elements }) }) as Response;
const status = (code: number) =>
  ({ ok: false, status: code, json: async () => ({}) }) as Response;
const now = () => new Date("2026-01-31T00:00:00Z");
const wait = jest.fn(async () => undefined);

beforeEach(() => wait.mockClear());

describe("needsEnrichment", () => {
  it("selects unchecked and stale located places that are not rejected", () => {
    const current = { osmMatcher: MATCHER_VERSION };
    expect(needsEnrichment(place(), now())).toBe(true);
    expect(
      needsEnrichment(
        place({ ...current, osmCheckedAt: "2026-01-20T00:00:00Z" }),
        now(),
      ),
    ).toBe(false);
    expect(
      needsEnrichment(
        place({ ...current, osmCheckedAt: "2025-12-01T00:00:00Z" }),
        now(),
      ),
    ).toBe(true);
    expect(needsEnrichment(place({ located: false }), now())).toBe(false);
    expect(needsEnrichment(place({ review: "not-cafe" }), now())).toBe(false);
  });

  it("rechecks places left unmatched by an older matcher", () => {
    const checkedAt = "2026-01-20T00:00:00Z";
    expect(needsEnrichment(place({ osmCheckedAt: checkedAt }), now())).toBe(
      true,
    );
    expect(
      needsEnrichment(place({ osmCheckedAt: checkedAt, osmMatcher: 1 }), now()),
    ).toBe(true);
    expect(
      needsEnrichment(
        place({
          osmCheckedAt: checkedAt,
          osmMatcher: 1,
          osm: { id: "node/1", distanceM: 1, tags: {} },
        }),
        now(),
      ),
    ).toBe(false);
  });
});

describe("enrichPlaces", () => {
  const near = {
    type: "node",
    id: 7,
    lat: 51.50001,
    lon: -0.12,
    tags: { name: "Kiln", opening_hours: "24/7" },
  };

  it("batches by cell, matches, replaces stale matches and reports progress", async () => {
    const fetchImpl = jest.fn(async () => ok([near]));
    const onBatch = jest.fn();
    const places = [
      place({ id: "a", osm: { id: "node/1", distanceM: 1, tags: {} } }),
      place({ id: "b", lat: 10, lng: 10, name: "Elsewhere" }),
    ];
    const result = await enrichPlaces(places, {
      fetchImpl,
      wait,
      now,
      onBatch,
      cellsPerQuery: 1,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(OVERPASS_URLS[0]);
    expect(result[0]).toMatchObject({
      id: "a",
      osm: { id: "node/7", name: "Kiln" },
      osmCheckedAt: "2026-01-31T00:00:00.000Z",
    });
    expect(result[1]?.osm).toBeUndefined();
    expect(onBatch).toHaveBeenLastCalledWith([result[1]], 2, 2);
    expect(wait).toHaveBeenCalledWith(1000);
  });

  it("offers candidates in a tower and keeps a café the user confirmed", async () => {
    const tower = [1, 2].map((id) => ({
      type: "node",
      id,
      lat: 51.5004 + id * 0.00001,
      lon: -0.12,
      tags: { name: `Cafe ${id}` },
    }));
    const fetchImpl = jest.fn(async () => ok(tower));
    const confirmed = { id: "node/2", distanceM: 9, tags: {} };
    const [open, picked, gone] = await enrichPlaces(
      [
        place({ id: "open", osmCandidates: [confirmed] }),
        place({ id: "picked", review: "cafe", osm: confirmed }),
        place({
          id: "gone",
          review: "cafe",
          osm: { id: "node/9", distanceM: 3, tags: {} },
        }),
      ],
      { fetchImpl, wait, now },
    );
    expect(open?.osm).toBeUndefined();
    expect(open?.osmCandidates?.map((c) => c.id)).toEqual(["node/1", "node/2"]);
    expect(open?.osmMatcher).toBe(MATCHER_VERSION);
    expect(picked?.osm).toMatchObject({ id: "node/2", name: "Cafe 2" });
    expect(picked?.osmCandidates).toBeUndefined();
    expect(gone?.osm?.id).toBe("node/9");
  });

  it("retries busy responses and network errors on the fallback mirror", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(status(429))
      .mockRejectedValueOnce(new Error("reset"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    const result = await enrichPlaces([place()], { fetchImpl, wait });
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(OVERPASS_URLS[1]);
    expect(result[0]?.osmCheckedAt).toBeDefined();
    expect(wait).toHaveBeenCalledWith(5000);
    expect(wait).toHaveBeenCalledWith(10000);
  });

  it("keeps using the endpoint that last answered", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(status(502))
      .mockResolvedValue(ok([]));
    await enrichPlaces([place()], { fetchImpl, wait });
    await enrichPlaces([place()], { fetchImpl, wait });
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual([
      OVERPASS_URLS[0],
      OVERPASS_URLS[1],
      OVERPASS_URLS[1],
    ]);
  });

  it("gives up after repeated failures and on client errors", async () => {
    await expect(
      enrichPlaces([place()], {
        fetchImpl: jest.fn(async () => status(504)),
        wait,
      }),
    ).rejects.toThrow(/busy/);
    expect(wait).toHaveBeenCalledTimes(6);
    expect(wait).toHaveBeenLastCalledWith(60000);
    await expect(
      enrichPlaces([place()], {
        fetchImpl: jest.fn(async () => status(400)),
        wait,
        now,
      }),
    ).rejects.toThrow(/400/);
  });

  it("stops immediately when aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = jest.fn(async () => {
      throw new Error("aborted");
    });
    await expect(
      enrichPlaces([place()], {
        fetchImpl,
        wait,
        now,
        signal: controller.signal,
      }),
    ).rejects.toThrow("aborted");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("sleep", () => {
  it("resolves after the delay", async () => {
    jest.useFakeTimers();
    const done = sleep(50);
    jest.advanceTimersByTime(50);
    await expect(done).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});
