import { osm, place, visit } from "../../test/fixtures";
import {
  DEFAULT_PREFERENCES,
  metricValues,
  Preferences,
  ScoreContext,
  scorePlace,
  socketScore,
  wifiScore,
} from "../scoring";

const ctx = (preferences: Partial<Preferences> = {}): ScoreContext => ({
  preferences: { ...DEFAULT_PREFERENCES, ...preferences },
  chainCounts: new Map(),
});

describe("socketScore", () => {
  it("prefers manual input over OSM tags", () => {
    expect(
      socketScore(
        place({ manual: { sockets: "few" }, osm: osm({ power_supply: "no" }) }),
      ),
    ).toBe(0.5);
    expect(socketScore(place({ osm: osm({ power_supply: "yes" }) }))).toBe(0.8);
    expect(socketScore(place({ osm: osm({ power_supply: "no" }) }))).toBe(0);
    expect(socketScore(place())).toBeUndefined();
  });
});

describe("wifiScore", () => {
  it("combines strength, time limit and fee", () => {
    expect(
      wifiScore(place({ manual: { wifi: "strong", wifiLimitMinutes: null } })),
    ).toBe(1);
    expect(
      wifiScore(place({ manual: { wifi: "strong", wifiLimitMinutes: 60 } })),
    ).toBeCloseTo(1 / 3);
    expect(
      wifiScore(place({ manual: { wifi: "ok", wifiLimitMinutes: 10 } })),
    ).toBeCloseTo(0.21);
    expect(
      wifiScore(
        place({
          osm: osm({ internet_access: "wlan", "internet_access:fee": "yes" }),
        }),
      ),
    ).toBeCloseTo(0.35);
    expect(wifiScore(place({ osm: osm({ internet_access: "no" }) }))).toBe(0);
    expect(
      wifiScore(place({ osm: osm({ internet_access: "terminal" }) })),
    ).toBeUndefined();
    expect(wifiScore(place({ manual: { wifiLimitMinutes: 180 } }))).toBeCloseTo(
      0.7,
    );
    expect(wifiScore(place())).toBeUndefined();
  });
});

describe("metricValues", () => {
  const rich = place({
    osm: osm({
      opening_hours: "Mo-Fr 08:00-21:00; Sa,Su 09:00-18:00",
      brand: "Big",
    }),
    manual: {
      seats: { "weekday-afternoon": "easy", "weekend-morning": "hard" },
      rating: 5,
    },
    visits: [
      visit("2024-01-01", 60, 1, 14 * 60),
      visit("2024-01-02", 60, 2, 2 * 60),
    ],
  });

  it("computes each metric from hours, seats, visits, chain and rating", () => {
    const m = metricValues(rich, ctx());
    expect(m.hours).toBe(1);
    expect(m.weekend).toBe(1);
    expect(m.seats).toBe(0.5);
    expect(m.independent).toBe(0);
    expect(m.habit).toBe(0.5);
    expect(m.familiarity).toBeCloseTo(Math.log2(3) / Math.log2(21));
    expect(m.rating).toBe(1);
    expect(metricValues(rich, ctx({ chain: "prefer" })).independent).toBe(1);
    expect(
      metricValues(rich, ctx({ chain: "neutral" })).independent,
    ).toBeUndefined();
  });

  it("infers weekends from visits when hours are unknown and leaves unknowns out", () => {
    expect(
      metricValues(place({ visits: [visit("x", 60, 6)] }), ctx()).weekend,
    ).toBe(1);
    const m = metricValues(place({ googleRating: 3 }), ctx());
    expect(m).toEqual({ rating: 0.5 });
  });
});

describe("scorePlace", () => {
  it("averages known metrics by weight and reports coverage", () => {
    const p = place({ manual: { sockets: "many", wifi: "none" } });
    const score = scorePlace(p, ctx());
    expect(score.value).toBe(50);
    expect(score.coverage).toBeCloseTo(6 / 18);
  });

  it("ignores zero-weight metrics and returns no value when nothing is known", () => {
    const weights = { ...DEFAULT_PREFERENCES.weights, wifi: 0 };
    expect(
      scorePlace(
        place({ manual: { sockets: "many", wifi: "none" } }),
        ctx({ weights }),
      ).value,
    ).toBe(100);
    expect(scorePlace(place(), ctx())).toEqual({ coverage: 0, metrics: {} });
    const none = Object.fromEntries(
      Object.keys(weights).map((k) => [k, 0]),
    ) as Preferences["weights"];
    expect(scorePlace(place(), ctx({ weights: none })).coverage).toBe(0);
  });
});
