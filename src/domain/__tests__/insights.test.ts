import { osm, place, visit } from "../../test/fixtures";
import {
  chainNameCounts,
  displayName,
  isBookmarked,
  isChain,
  isLikelyCafe,
  isVisited,
  partOfDay,
  scheduleOf,
  slotOf,
  visitPattern,
} from "../insights";

describe("insights", () => {
  it("names a place from its own name, then OSM", () => {
    expect(
      displayName(place({ name: "Mine", osm: osm({ name: "OSM" }) })),
    ).toBe("Mine");
    expect(displayName(place({ osm: osm({ name: "OSM" }) }))).toBe("OSM");
    expect(
      displayName(
        place({
          osmCandidates: [osm({ name: "A" }), osm({}), osm({ name: "B" })],
        }),
      ),
    ).toBe("A or B?");
    expect(displayName(place({ osmCandidates: [osm({})] }))).toBe(
      "Unnamed place",
    );
    expect(displayName(place())).toBe("Unnamed place");
  });

  it("parses the schedule from OSM tags", () => {
    expect(
      scheduleOf(place({ osm: osm({ opening_hours: "24/7" }) }))?.length,
    ).toBe(7);
    expect(scheduleOf(place())).toBeUndefined();
  });

  it("detects chains from manual override, brand tags, repeated names and OSM presence", () => {
    const repeated = Array.from({ length: 3 }, (_, i) =>
      place({ id: `${i}`, osm: osm({ name: "Same Co" }) }),
    );
    const counts = chainNameCounts([
      ...repeated,
      place({ osm: osm({ brand: "Big" }) }),
      place(),
    ]);
    expect(
      isChain(
        place({ manual: { chain: false }, osm: osm({ brand: "B" }) }),
        counts,
      ),
    ).toBe(false);
    expect(
      isChain(place({ osm: osm({ "brand:wikidata": "Q1" }) }), counts),
    ).toBe(true);
    expect(isChain(place({ name: "same co" }), counts)).toBe(true);
    expect(isChain(place({ osm: osm({ name: "Solo" }) }), counts)).toBe(false);
    expect(isChain(place({ name: "Solo" }), counts)).toBeUndefined();
    expect(isChain(place(), counts)).toBeUndefined();
  });

  it("buckets times into parts of day and slots", () => {
    expect(partOfDay(7 * 60)).toBe("morning");
    expect(partOfDay(13 * 60)).toBe("afternoon");
    expect(partOfDay(20 * 60)).toBe("evening");
    expect(partOfDay(2 * 60)).toBeUndefined();
    expect(slotOf(6, 9 * 60)).toBe("weekend-morning");
    expect(slotOf(3, 23 * 60 + 30)).toBeUndefined();
  });

  it("summarises the visit pattern", () => {
    const p = place({
      visits: [
        visit("2024-01-01", 30, 1, 9 * 60),
        visit("2024-01-06", 90, 6, 14 * 60),
        visit("2024-01-07", 60, 0, 1 * 60),
      ],
    });
    const pattern = visitPattern(p);
    expect(pattern).toMatchObject({
      total: 3,
      medianMinutes: 60,
      lastVisit: "2024-01-07",
      slots: { "weekday-morning": 1, "weekend-afternoon": 1 },
    });
    expect(pattern.weekendShare).toBeCloseTo(2 / 3);
    expect(pattern.heatmap[6]?.[14]).toBe(1);
    const empty = visitPattern(place());
    expect(empty).toMatchObject({ total: 0, weekendShare: 0 });
    expect(empty.medianMinutes).toBeUndefined();
  });

  it("leaves check-ins out of the median stay", () => {
    const checkin = { ...visit("2024-01-08", 0), source: "checkin" as const };
    expect(
      visitPattern(place({ visits: [visit("2024-01-01", 40), checkin] })),
    ).toMatchObject({ total: 2, medianMinutes: 40 });
    expect(
      visitPattern(place({ visits: [checkin] })).medianMinutes,
    ).toBeUndefined();
  });

  it("classifies status and café likelihood", () => {
    expect(isVisited(place({ visits: [visit("x")] }))).toBe(true);
    expect(isBookmarked(place({ lists: ["L"] }))).toBe(true);
    expect(isLikelyCafe(place({ osm: osm() }))).toBe(true);
    expect(isLikelyCafe(place())).toBe(false);
    expect(isLikelyCafe(place({ osmCandidates: [osm()] }))).toBe(true);
    expect(isLikelyCafe(place({ osmCandidates: [] }))).toBe(false);
    expect(isLikelyCafe(place({ review: "cafe" }))).toBe(true);
    expect(isLikelyCafe(place({ review: "not-cafe", osm: osm() }))).toBe(false);
  });
});
