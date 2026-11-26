import { place, visit } from "../../test/fixtures";
import {
  checkinVisit,
  dropCoveredCheckins,
  freshness,
  logCheckin,
  nearbyPlaces,
  overlaps,
} from "../checkin";
import { Visit } from "../types";

const checkin = (start: string): Visit => ({
  ...visit(start, 0),
  source: "checkin",
});

describe("checkinVisit", () => {
  it("stamps the device clock as a zero-length check-in", () => {
    const now = new Date(2026, 10, 26, 14, 35);
    expect(checkinVisit(now)).toEqual({
      start: now.toISOString(),
      localDay: now.getDay(),
      localMinute: 14 * 60 + 35,
      durationMin: 0,
      source: "checkin",
    });
  });
});

describe("nearbyPlaces", () => {
  it("suggests up to five located places within 150 m, nearest first", () => {
    const here = { lat: 35.66, lng: 139.7 };
    const at = (id: string, metresNorth: number, extra = {}) =>
      place({ id, lat: 35.66 + metresNorth / 111_320, lng: 139.7, ...extra });
    const result = nearbyPlaces(
      [
        at("far", 400),
        at("c", 90),
        at("a", 10),
        at("b", 40),
        at("unlocated", 0, { located: false }),
        at("rejected", 5, { review: "not-cafe" }),
        at("d", 100),
        at("e", 120),
        at("f", 140),
      ],
      here,
    );
    expect(result.map((n) => n.place.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(result[0]?.distance).toBeCloseTo(10, 0);
  });
});

describe("overlaps", () => {
  const stay = visit("2026-11-20T10:00:00.000Z", 180);
  it("counts a check-in within two hours either side of a stay", () => {
    expect(overlaps(checkin("2026-11-20T08:00:00.000Z"), stay)).toBe(true);
    expect(overlaps(checkin("2026-11-20T12:30:00.000Z"), stay)).toBe(true);
    expect(overlaps(checkin("2026-11-20T15:00:00.000Z"), stay)).toBe(true);
    expect(overlaps(checkin("2026-11-20T07:59:00.000Z"), stay)).toBe(false);
    expect(overlaps(checkin("2026-11-20T15:01:00.000Z"), stay)).toBe(false);
  });
});

describe("dropCoveredCheckins", () => {
  it("drops check-ins that a Timeline visit covers and keeps the rest", () => {
    const kept = dropCoveredCheckins([
      visit("2026-11-20T10:00:00.000Z", 60),
      checkin("2026-11-20T10:30:00.000Z"),
      checkin("2026-11-22T10:30:00.000Z"),
    ]);
    expect(kept.map((v) => v.start)).toEqual([
      "2026-11-20T10:00:00.000Z",
      "2026-11-22T10:30:00.000Z",
    ]);
  });
});

describe("logCheckin", () => {
  it("adds the visit in order and ignores a repeat tap", () => {
    const base = place({ visits: [visit("2026-11-01T10:00:00.000Z")] });
    const first = logCheckin(base, checkin("2026-11-26T05:00:00.000Z"));
    expect(first.visits).toHaveLength(2);
    expect(first.visits[1]?.source).toBe("checkin");
    const again = logCheckin(first, checkin("2026-11-26T05:20:00.000Z"));
    expect(again).toBe(first);
  });
});

describe("freshness", () => {
  it("reports the latest Timeline visit and check-ins after it", () => {
    expect(
      freshness([
        place({
          visits: [
            visit("2026-11-01T10:00:00.000Z"),
            checkin("2026-10-01T10:00:00.000Z"),
            checkin("2026-11-20T10:00:00.000Z"),
          ],
        }),
        place({ visits: [checkin("2026-11-25T10:00:00.000Z")] }),
      ]),
    ).toEqual({ timelineUpTo: "2026-11-01T10:00:00.000Z", checkinsSince: 2 });
  });

  it("counts every check-in when there is no Timeline yet", () => {
    expect(
      freshness([place({ visits: [checkin("2026-11-20T10:00:00.000Z")] })]),
    ).toEqual({ checkinsSince: 1 });
  });
});
