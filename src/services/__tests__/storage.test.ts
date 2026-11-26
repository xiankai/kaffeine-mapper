import { get, set } from "idb-keyval";
import { place } from "../../test/fixtures";
import { DEFAULT_PREFERENCES } from "../../domain/scoring";
import {
  loadPersisted,
  parseDatasetFile,
  saveDataset,
  savePreferences,
} from "../storage";

jest.mock("idb-keyval", () => ({
  get: jest.fn(),
  set: jest.fn(async () => undefined),
}));

const mockGet = get as jest.Mock;

beforeEach(() => mockGet.mockReset());

describe("loadPersisted", () => {
  it("returns stored data merged over defaults", async () => {
    const dataset = { version: 1, places: [place()] };
    mockGet.mockImplementation(async (key: string) =>
      key.endsWith("dataset")
        ? dataset
        : { chain: "prefer", weights: { wifi: 5 } },
    );
    const loaded = await loadPersisted();
    expect(loaded.dataset).toBe(dataset);
    expect(loaded.preferences.chain).toBe("prefer");
    expect(loaded.preferences.weights).toEqual({
      ...DEFAULT_PREFERENCES.weights,
      wifi: 5,
    });
    expect(loaded.preferences.slots).toEqual(DEFAULT_PREFERENCES.slots);
  });

  it("falls back to empty defaults on missing, unknown or failing storage", async () => {
    mockGet
      .mockResolvedValueOnce({ version: 99 })
      .mockRejectedValueOnce(new Error("blocked"));
    expect(await loadPersisted()).toEqual({
      dataset: { version: 1, places: [] },
      preferences: DEFAULT_PREFERENCES,
    });
  });
});

describe("saving", () => {
  it("writes under stable keys", async () => {
    await saveDataset({ version: 1, places: [] });
    await savePreferences(DEFAULT_PREFERENCES);
    expect(set).toHaveBeenCalledWith("kaffeine:dataset", {
      version: 1,
      places: [],
    });
    expect(set).toHaveBeenCalledWith(
      "kaffeine:preferences",
      DEFAULT_PREFERENCES,
    );
  });
});

describe("parseDatasetFile", () => {
  it("accepts exports and rejects anything else", () => {
    expect(parseDatasetFile({ version: 1, places: [], extra: 1 })).toEqual({
      version: 1,
      places: [],
    });
    expect(() => parseDatasetFile({ version: 1 })).toThrow(/export/);
    expect(() => parseDatasetFile(null)).toThrow(/export/);
  });

  it("round-trips check-ins and evaluations through a JSON backup", () => {
    const dataset = {
      version: 1 as const,
      places: [
        place({
          visits: [
            {
              start: "2026-11-26T05:00:00.000Z",
              localDay: 4,
              localMinute: 840,
              durationMin: 0,
              source: "checkin",
            },
          ],
          manual: { wifiLimitMinutes: null },
          evaluations: [
            {
              at: "2026-11-26T05:00:00.000Z",
              wifiLimitMinutes: null,
              seats: { "weekday-afternoon": "easy" },
              note: "quiet",
            },
          ],
        }),
        place({ id: "g:old" }),
      ],
    };
    const restored = parseDatasetFile(JSON.parse(JSON.stringify(dataset)));
    expect(restored).toEqual(dataset);
    expect(restored.places[1]?.evaluations).toBeUndefined();
  });
});
