import { osm, place, visit } from "../../test/fixtures";
import {
  confidentScore,
  DEFAULT_FILTERS,
  Filters,
  rankPlaces,
} from "../filters";
import { DEFAULT_PREFERENCES } from "../scoring";

const ctx = {
  preferences: DEFAULT_PREFERENCES,
  chainCounts: new Map<string, number>(),
};
const run = (
  places: Parameters<typeof rankPlaces>[0],
  patch: Partial<Filters>,
) =>
  rankPlaces(places, { ...DEFAULT_FILTERS, ...patch }, ctx).map(
    (r) => r.place.id,
  );

const cafe = place({
  id: "cafe",
  name: "Alpha",
  osm: osm({
    opening_hours: "Mo-Su 08:00-20:00",
    internet_access: "wlan",
    power_supply: "yes",
  }),
  visits: [visit("2024-01-02", 60), visit("2024-01-01", 60)],
});
const saved = place({
  id: "saved",
  name: "Beta",
  lists: ["Laptop"],
  sources: ["saved"],
  review: "cafe",
  manual: { sockets: "none" },
});
const both = place({
  id: "both",
  name: "Gamma",
  lists: ["Laptop"],
  visits: [visit("2024-02-01")],
  osm: osm({ brand: "Chain", opening_hours: "Mo-Fr 08:00-18:00" }),
});
const pending = place({ id: "pending", name: "Delta" });
const hidden = place({ id: "hidden", located: false, review: "cafe" });
const all = [cafe, saved, both, pending, hidden];

describe("confidentScore", () => {
  it("pulls sparsely known scores toward neutral", () => {
    expect(
      confidentScore({ value: 99, coverage: 0.25, metrics: {} }),
    ).toBeCloseTo(62.25);
    expect(
      confidentScore({ value: 80, coverage: 0.9, metrics: {} }),
    ).toBeCloseTo(77);
    expect(confidentScore({ coverage: 0, metrics: {} })).toBe(-1);
  });
});

describe("rankPlaces", () => {
  it("filters by status", () => {
    expect(run(all, { status: "visited" }).sort()).toEqual(["both", "cafe"]);
    expect(run(all, { status: "bookmarked" }).sort()).toEqual([
      "both",
      "saved",
    ]);
    expect(run(all, { status: "to-try" })).toEqual(["saved"]);
  });

  it("filters by review state", () => {
    expect(run(all, { review: "pending" }).sort()).toEqual([
      "both",
      "cafe",
      "pending",
    ]);
    expect(run(all, { review: "all" })).toHaveLength(4);
  });

  it("filters by opening hours and weekends", () => {
    expect(run(all, { openAt: { day: 6, minute: 600 } })).toEqual(["cafe"]);
    expect(run(all, { weekend: true })).toEqual(["cafe"]);
    expect(run(all, { openAt: { day: 1, minute: 19 * 60 } })).toEqual(["cafe"]);
  });

  it("filters by amenities and chain status", () => {
    expect(run(all, { sockets: true })).toEqual(["cafe"]);
    expect(run(all, { wifi: true })).toEqual(["cafe"]);
    expect(run(all, { independent: true })).toEqual(["cafe"]);
  });

  it("keeps only places within the chosen area", () => {
    const tokyo = place({ id: "tokyo", lat: 35.68, lng: 139.76 });
    const places = [...all, { ...tokyo, review: "cafe" as const }];
    expect(run(places, { area: { lat: 35.7, lng: 139.7 } })).toEqual(["tokyo"]);
    expect(run(places, { area: undefined })).toHaveLength(4);
  });

  it("searches names and lists", () => {
    expect(run(all, { query: "gam" })).toEqual(["both"]);
    expect(run(all, { query: "laptop" }).sort()).toEqual(["both", "saved"]);
    expect(run(all, { query: "  " })).toHaveLength(3);
  });

  it("sorts by score, visits, name and recency", () => {
    expect(run(all, { sort: "score" })[0]).toBe("cafe");
    expect(run(all, { sort: "visits" })[0]).toBe("cafe");
    expect(run(all, { sort: "name" })).toEqual(["cafe", "saved", "both"]);
    expect(run(all, { sort: "recent" })).toEqual(["both", "cafe", "saved"]);
  });
});
