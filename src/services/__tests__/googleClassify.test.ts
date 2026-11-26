import { place } from "../../test/fixtures";
import {
  classifyPlaces,
  describeLookupError,
  isSkippable,
} from "../googleClassify";

const places = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    place({ id: `g:${i}`, googlePlaceId: `p${i}` }),
  );

const coded = (code: string) =>
  Object.assign(new Error("request failed"), { code });

describe("classifyPlaces", () => {
  it("looks up every place with at most the given number in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    const lookup = jest.fn(async (id: string) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return id === "p0" ? ["cafe"] : ["store"];
    });
    const onBatch = jest.fn();
    const done = await classifyPlaces(places(12), {
      lookup,
      onBatch,
      concurrency: 5,
      batchSize: 5,
    });
    expect(done).toBe(12);
    expect(peak).toBe(5);
    expect(lookup).toHaveBeenCalledTimes(12);
    expect(onBatch.mock.calls.map(([, finished]) => finished)).toEqual([
      5, 10, 12,
    ]);
    const results = onBatch.mock.calls.flatMap(([batch]) => batch);
    expect(results).toContainEqual({ id: "g:0", googleType: "cafe" });
    expect(results).toContainEqual({ id: "g:1", googleType: "not-cafe" });
  });

  it("records unclear places without a type", async () => {
    const onBatch = jest.fn();
    await classifyPlaces(places(1), {
      lookup: async () => ["point_of_interest"],
      onBatch,
    });
    expect(onBatch).toHaveBeenCalledWith([{ id: "g:0" }], 1, 1);
  });

  it("skips places Google doesn't know and marks them checked", async () => {
    const onBatch = jest.fn();
    const done = await classifyPlaces([place({ id: "g:x" }), ...places(1)], {
      lookup: async (id) => {
        if (id === "") throw coded("INVALID_ARGUMENT");
        throw coded("NOT_FOUND");
      },
      onBatch,
    });
    expect(done).toBe(2);
    expect(onBatch.mock.calls[0][0]).toEqual([{ id: "g:x" }, { id: "g:0" }]);
  });

  it("stops on quota errors and keeps what finished", async () => {
    const onBatch = jest.fn();
    await expect(
      classifyPlaces(places(3), {
        lookup: async (id) => {
          if (id === "p1") throw coded("RESOURCE_EXHAUSTED");
          return ["cafe"];
        },
        onBatch,
        concurrency: 1,
      }),
    ).rejects.toThrow(/quota/);
    expect(onBatch).toHaveBeenCalledWith(
      [{ id: "g:0", googleType: "cafe" }],
      1,
      3,
    );
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    const onBatch = jest.fn();
    const done = await classifyPlaces(places(5), {
      lookup: async () => {
        controller.abort();
        return ["cafe"];
      },
      onBatch,
      signal: controller.signal,
      concurrency: 1,
    });
    expect(done).toBe(1);
    expect(onBatch).toHaveBeenCalledTimes(1);
  });

  it("does nothing for an empty list", async () => {
    const onBatch = jest.fn();
    expect(await classifyPlaces([], { lookup: jest.fn(), onBatch })).toBe(0);
    expect(onBatch).not.toHaveBeenCalled();
  });
});

describe("lookup errors", () => {
  it("tells skippable errors from fatal ones", () => {
    expect(isSkippable(coded("NOT_FOUND"))).toBe(true);
    expect(isSkippable(new Error("INVALID_REQUEST: bad id"))).toBe(true);
    expect(isSkippable(coded("PERMISSION_DENIED"))).toBe(false);
    expect(isSkippable("boom")).toBe(false);
    expect(
      isSkippable(
        Object.assign(new Error("API key not valid"), {
          code: "INVALID_ARGUMENT",
        }),
      ),
    ).toBe(false);
    expect(isSkippable(coded("INVALID_ARGUMENT"))).toBe(true);
    expect(
      describeLookupError(new Error("INVALID_ARGUMENT: API key not valid")),
    ).toMatch(/refused/);
  });

  it("explains why a run stopped", () => {
    expect(describeLookupError(coded("RESOURCE_EXHAUSTED"))).toMatch(/quota/);
    expect(describeLookupError(coded("PERMISSION_DENIED"))).toMatch(/refused/);
    expect(describeLookupError(new Error("offline"))).toBe(
      "Google lookup failed: offline",
    );
  });
});
