import { place } from "../../test/fixtures";
import { centroid, geocodeUnlocated, NOMINATIM_URL } from "../geocode";

const reply = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as Response;

describe("centroid", () => {
  it("averages located places", () => {
    expect(
      centroid([
        place({ lat: 0, lng: 0 }),
        place({ lat: 2, lng: 4 }),
        place({ located: false, lat: 99 }),
      ]),
    ).toEqual({ lat: 1, lng: 2 });
    expect(centroid([])).toBeUndefined();
  });
});

describe("geocodeUnlocated", () => {
  it("looks up named unlocated places near the centroid, one per second", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(reply([{ lat: "51.5", lon: "-0.1" }]))
      .mockResolvedValueOnce(reply([]))
      .mockResolvedValueOnce(reply(null, false));
    const wait = jest.fn(async () => undefined);
    const onProgress = jest.fn();
    const input = [
      place({ id: "1", name: "Kiln", located: false }),
      place({ id: "2", name: "Gone", located: false }),
      place({ id: "3", name: "Err", located: false }),
      place({ id: "4", located: false }),
      place({ id: "5" }),
    ];
    const result = await geocodeUnlocated(input, {
      fetchImpl,
      wait,
      near: { lat: 51, lng: 0 },
      onProgress,
    });
    expect(result.map((p) => [p.id, p.located])).toEqual([
      ["1", true],
      ["2", false],
      ["3", false],
    ]);
    expect(result[0]).toMatchObject({ lat: 51.5, lng: -0.1 });
    const url = new URL(fetchImpl.mock.calls[0][0]);
    expect(`${url.origin}${url.pathname}`).toBe(NOMINATIM_URL);
    expect(url.searchParams.get("q")).toBe("Kiln");
    expect(url.searchParams.get("viewbox")).toBe("-0.5,51.5,0.5,50.5");
    expect(wait).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(3, 3);
  });

  it("omits the viewbox without a centre", async () => {
    const fetchImpl = jest.fn(async () => reply([]));
    await geocodeUnlocated([place({ name: "X", located: false })], {
      fetchImpl,
    });
    expect(
      new URL(
        (fetchImpl.mock.calls[0] as unknown as [string])[0],
      ).searchParams.has("viewbox"),
    ).toBe(false);
  });
});
