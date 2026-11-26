import { place, visit } from "../../test/fixtures";
import { googleTypeOf } from "../googleTypes";
import { mergePlace } from "../merge";
import {
  applyGoogleType,
  applyGoogleTypes,
  needsGoogleCheck,
  triageVerdict,
} from "../triage";

const AT = "2026-11-26T00:00:00.000Z";

describe("googleTypeOf", () => {
  it.each([
    [["cafe", "food", "point_of_interest"], "cafe"],
    [["coffee_shop"], "cafe"],
    [["tea_house", "store"], "cafe"],
    [["bakery", "store"], "cafe-ish"],
    [["restaurant"], "cafe-ish"],
    [["ramen_restaurant", "point_of_interest"], "cafe-ish"],
    [["train_station", "transit_station", "point_of_interest"], "not-cafe"],
    [["store", "establishment"], "not-cafe"],
    [["lodging"], "not-cafe"],
    [["point_of_interest", "establishment"], undefined],
    [["street_address"], undefined],
    [[], undefined],
  ])("maps %j to %s", (types, expected) => {
    expect(googleTypeOf(types)).toBe(expected);
  });
});

describe("Google triage", () => {
  const signals = {
    visits: 1,
    timelineVisits: 1,
    longestVisitMin: 10,
    onList: false,
  };

  it("lets a Google type decide the verdict", () => {
    expect(triageVerdict({ ...signals, googleType: "cafe" })).toBe("cafe");
    expect(triageVerdict({ ...signals, googleType: "not-cafe" })).toBe(
      "not-cafe",
    );
    expect(triageVerdict({ ...signals, googleType: "cafe-ish" })).toBe(
      "short-visit",
    );
  });

  it("only checks undecided places with a Google ID that weren't checked", () => {
    expect(needsGoogleCheck(place({ googlePlaceId: "a" }))).toBe(true);
    expect(needsGoogleCheck(place())).toBe(false);
    expect(
      needsGoogleCheck(place({ googlePlaceId: "a", googleCheckedAt: AT })),
    ).toBe(false);
    expect(
      needsGoogleCheck(
        place({ googlePlaceId: "a", review: "cafe", reviewBy: "owner" }),
      ),
    ).toBe(false);
  });

  it("confirms cafés and rules out other places", () => {
    expect(applyGoogleType(place(), "cafe", AT)).toMatchObject({
      review: "cafe",
      reviewBy: "google",
      googleCheckedAt: AT,
    });
    expect(applyGoogleType(place(), "not-cafe", AT)).toMatchObject({
      review: "not-cafe",
      reviewBy: "google",
    });
  });

  it("leaves unclear places pending but records the check", () => {
    const long = place({ visits: [visit("2024-01-01T10:00:00Z", 60)] });
    for (const type of ["cafe-ish", undefined] as const) {
      const result = applyGoogleType(long, type, AT);
      expect(result.review).toBe("pending");
      expect(result.reviewBy).toBeUndefined();
      expect(result.googleCheckedAt).toBe(AT);
    }
  });

  it("never touches an owner decision", () => {
    const owned = place({ review: "cafe", reviewBy: "owner" });
    expect(applyGoogleType(owned, "not-cafe", AT)).toEqual({
      ...owned,
      googleCheckedAt: AT,
    });
  });

  it("applies results by place id", () => {
    const dataset = {
      version: 1 as const,
      places: [place({ id: "a" }), place({ id: "b" }), place({ id: "c" })],
    };
    const next = applyGoogleTypes(
      dataset,
      [{ id: "a", googleType: "cafe" }, { id: "b" }],
      AT,
    );
    expect(next.places.map((p) => [p.review, p.googleCheckedAt])).toEqual([
      ["cafe", AT],
      ["pending", AT],
      ["pending", undefined],
    ]);
  });

  it("weighs a Google verdict like an automatic one when merging", () => {
    const google = place({ review: "not-cafe", reviewBy: "google" });
    const owner = place({ review: "cafe", reviewBy: "owner" });
    expect(mergePlace(google, owner).reviewBy).toBe("owner");
    expect(mergePlace(google, place()).reviewBy).toBe("google");
  });
});
