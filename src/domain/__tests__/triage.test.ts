import { osm, place, visit } from "../../test/fixtures";
import { checkinVisit } from "../checkin";
import {
  autoTriage,
  byVisitsThenMinutes,
  decideMany,
  decideReview,
  isShortVisitOnly,
  triageDataset,
  triageSignals,
  triageVerdict,
} from "../triage";

const near = (distanceM: number) => ({ ...osm({ name: "Kiln" }), distanceM });

describe("triageSignals", () => {
  it("reads the clear match, Timeline visits and lists", () => {
    expect(
      triageSignals(
        place({
          osm: near(12),
          lists: ["Want to go"],
          visits: [
            visit("2026-01-01", 20),
            visit("2026-01-02", 70),
            checkinVisit(new Date("2026-02-01T10:00:00Z")),
          ],
        }),
      ),
    ).toEqual({
      clearOsmMatchM: 12,
      visits: 3,
      timelineVisits: 2,
      longestVisitMin: 70,
      onList: true,
    });
  });

  it("has no clear match while candidates are open", () => {
    const signals = triageSignals(
      place({ osm: near(5), osmCandidates: [near(5), near(9)] }),
    );
    expect(signals.clearOsmMatchM).toBeUndefined();
    expect(signals.longestVisitMin).toBe(0);
  });
});

describe("triageVerdict", () => {
  const base = { visits: 2, timelineVisits: 2, onList: false };

  it("calls a close match with a long visit a café", () => {
    expect(
      triageVerdict({ ...base, clearOsmMatchM: 25, longestVisitMin: 45 }),
    ).toBe("cafe");
    expect(
      triageVerdict({ ...base, clearOsmMatchM: 26, longestVisitMin: 90 }),
    ).toBe("undecided");
    expect(
      triageVerdict({ ...base, clearOsmMatchM: 5, longestVisitMin: 44 }),
    ).toBe("undecided");
    expect(triageVerdict({ ...base, longestVisitMin: 90 })).toBe("undecided");
  });

  it("sets aside one short visit that isn't on a list", () => {
    const once = { visits: 1, timelineVisits: 1, onList: false };
    expect(triageVerdict({ ...once, longestVisitMin: 29 })).toBe("short-visit");
    expect(triageVerdict({ ...once, longestVisitMin: 30 })).toBe("undecided");
    expect(triageVerdict({ ...once, longestVisitMin: 5, onList: true })).toBe(
      "undecided",
    );
    expect(triageVerdict({ ...once, visits: 2, longestVisitMin: 5 })).toBe(
      "undecided",
    );
    expect(
      triageVerdict({ ...once, timelineVisits: 0, longestVisitMin: 0 }),
    ).toBe("undecided");
  });
});

describe("autoTriage", () => {
  const confident = place({ osm: near(10), visits: [visit("2026-01-01", 60)] });

  it("confirms a confident café and marks it automatic", () => {
    expect(autoTriage(confident)).toMatchObject({
      review: "cafe",
      reviewBy: "auto",
    });
  });

  it("never touches a decision the owner made", () => {
    const decided = [
      { ...confident, review: "not-cafe" as const },
      { ...confident, review: "pending" as const, reviewBy: "owner" as const },
      { ...confident, review: "cafe" as const, reviewBy: "auto" as const },
    ];
    decided.forEach((p) => expect(autoTriage(p)).toBe(p));
  });

  it("leaves an undecided place alone", () => {
    const short = place({ visits: [visit("2026-01-01", 10)] });
    expect(autoTriage(short)).toBe(short);
    expect(isShortVisitOnly(short)).toBe(true);
    expect(isShortVisitOnly(confident)).toBe(false);
  });

  it("returns the same dataset when nothing changes", () => {
    const quiet = { version: 1 as const, places: [place()] };
    expect(triageDataset(quiet)).toBe(quiet);
    const changed = triageDataset({ version: 1, places: [confident] });
    expect(changed.places[0]?.reviewBy).toBe("auto");
  });
});

describe("owner decisions", () => {
  it("records the owner as the decider", () => {
    expect(decideReview(place(), "pending")).toMatchObject({
      review: "pending",
      reviewBy: "owner",
    });
    const out = decideMany(
      { version: 1, places: [place({ id: "a" }), place({ id: "b" })] },
      ["b"],
      "not-cafe",
    );
    expect(out.places.map((p) => [p.review, p.reviewBy])).toEqual([
      ["pending", undefined],
      ["not-cafe", "owner"],
    ]);
  });
});

describe("byVisitsThenMinutes", () => {
  it("orders by visit count, then total minutes", () => {
    const places = [
      place({ id: "one", visits: [visit("1", 300)] }),
      place({ id: "two-short", visits: [visit("1", 10), visit("2", 10)] }),
      place({ id: "two-long", visits: [visit("1", 60), visit("2", 60)] }),
    ];
    expect(places.sort(byVisitsThenMinutes).map((p) => p.id)).toEqual([
      "two-long",
      "two-short",
      "one",
    ]);
  });
});
