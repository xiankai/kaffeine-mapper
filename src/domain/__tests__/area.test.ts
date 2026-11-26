import { place, visit } from "../../test/fixtures";
import { isAreaMode, recentAnchor, withinArea } from "../area";

const TOKYO = { lat: 35.68, lng: 139.76 };
const SHIBUYA = { lat: 35.66, lng: 139.7 };
const LONDON = { lat: 51.5, lng: -0.12 };

describe("recentAnchor", () => {
  it("is undefined without located places", () => {
    expect(recentAnchor([])).toBeUndefined();
    expect(recentAnchor([place({ located: false })])).toBeUndefined();
  });

  it("centres on the latest visits and ignores an old trip", () => {
    const tokyoVisits = Array.from({ length: 10 }, (_, i) =>
      place({
        id: `t${i}`,
        ...(i % 2 ? TOKYO : SHIBUYA),
        visits: [visit(`2026-11-${String(i + 10).padStart(2, "0")}`)],
      }),
    );
    const trip = place({
      id: "london",
      ...LONDON,
      visits: [visit("2025-03-01"), visit("2025-03-02")],
    });
    expect(recentAnchor([trip, ...tokyoVisits])).toEqual(TOKYO);
  });

  it("lands on the busiest cluster, not between two cities", () => {
    const anchor = recentAnchor([
      place({ id: "a", ...TOKYO, visits: [visit("2026-11-01")] }),
      place({ id: "b", ...SHIBUYA, visits: [visit("2026-11-02")] }),
      place({ id: "c", ...LONDON, visits: [visit("2026-11-03")] }),
      place({ id: "d", lat: 34.69, lng: 135.5, visits: [visit("2026-11-04")] }),
    ]);
    expect(anchor).toEqual(SHIBUYA);
  });

  it("falls back to all located places when nothing was visited", () => {
    expect(
      recentAnchor([
        place({ id: "a", ...TOKYO, sources: ["saved"] }),
        place({ id: "b", ...SHIBUYA, sources: ["saved"] }),
      ]),
    ).toEqual(TOKYO);
  });
});

describe("withinArea", () => {
  it("keeps everything without a centre", () => {
    expect(withinArea(place(LONDON), undefined)).toBe(true);
  });

  it("keeps places within the radius only", () => {
    expect(withinArea(place(SHIBUYA), TOKYO)).toBe(true);
    expect(withinArea(place(LONDON), TOKYO)).toBe(false);
  });
});

it("recognises area modes", () => {
  expect(isAreaMode("near")).toBe(true);
  expect(isAreaMode("city")).toBe(false);
  expect(isAreaMode(null)).toBe(false);
});
