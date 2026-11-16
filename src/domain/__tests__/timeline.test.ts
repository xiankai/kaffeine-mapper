import { segment } from "../../test/fixtures";
import { parseLatLng, parseTimeline, toLocalVisit } from "../timeline";

describe("parseLatLng", () => {
  it("reads Android degree strings, iOS geo: strings and objects", () => {
    expect(parseLatLng({ latLng: "1.5°, 103.25°" })).toEqual({
      lat: 1.5,
      lng: 103.25,
    });
    expect(parseLatLng("geo:-33.8,151.2")).toEqual({ lat: -33.8, lng: 151.2 });
  });

  it("rejects malformed or out-of-range values", () => {
    expect(parseLatLng("nowhere")).toBeUndefined();
    expect(parseLatLng(42)).toBeUndefined();
    expect(parseLatLng("geo:95,10")).toBeUndefined();
  });
});

describe("toLocalVisit", () => {
  it("uses the explicit offset for local day and minute", () => {
    const v = toLocalVisit("2024-03-02T23:30:00Z", "2024-03-03T01:00:00Z", 480);
    expect(v).toEqual({
      start: "2024-03-02T23:30:00.000Z",
      localDay: 0,
      localMinute: 7 * 60 + 30,
      durationMin: 90,
    });
  });

  it("falls back to the ISO offset, including negative ones", () => {
    expect(
      toLocalVisit("2024-03-04T08:15:00-05:00", "2024-03-04T09:00:00-05:00")
        ?.localMinute,
    ).toBe(8 * 60 + 15);
    expect(
      toLocalVisit("2024-03-04T08:15:00Z", "2024-03-04T09:00:00Z")?.localMinute,
    ).toBe(8 * 60 + 15);
  });

  it("rejects bad or reversed times", () => {
    expect(toLocalVisit("nope", "2024-01-01T00:00:00Z")).toBeUndefined();
    expect(
      toLocalVisit("2024-01-01T02:00:00Z", "2024-01-01T01:00:00Z"),
    ).toBeUndefined();
  });
});

describe("parseTimeline", () => {
  it("groups qualifying visits by place and keeps every visit of a qualifying place", () => {
    const json = {
      semanticSegments: [
        segment("cafe", "2024-01-02T10:00:00Z", "2024-01-02T11:00:00Z"),
        segment("cafe", "2024-01-01T10:00:00Z", "2024-01-01T10:05:00Z"),
        segment("drive-by", "2024-01-01T10:00:00Z", "2024-01-01T10:05:00Z"),
        segment("home", "2024-01-01T10:00:00Z", "2024-01-01T18:00:00Z", {
          semanticType: "HOME",
        }),
        { activity: {} },
        {
          startTime: "x",
          endTime: "y",
          visit: { topCandidate: { placeId: "bad", placeLocation: "?" } },
        },
        segment("broken", "2024-01-02T10:00:00Z", "2024-01-02T09:00:00Z"),
      ],
    };
    const result = parseTimeline(json);
    expect(result.segmentCount).toBe(7);
    expect(result.visitCount).toBe(4);
    expect(result.places).toHaveLength(1);
    const [cafe] = result.places;
    expect(cafe?.id).toBe("g:cafe");
    expect(cafe?.visits.map((v) => v.durationMin)).toEqual([5, 60]);
  });

  it("accepts the iOS list shape with placeID and geo: locations", () => {
    const result = parseTimeline(
      [
        {
          startTime: "2024-01-01T10:00:00+09:00",
          endTime: "2024-01-01T11:00:00+09:00",
          visit: {
            topCandidate: {
              placeID: "ios",
              semanticType: "Unknown",
              placeLocation: "geo:35.6,139.7",
            },
          },
        },
      ],
      { minMinutes: 20, maxMinutes: 360, semanticTypes: ["Unknown"] },
    );
    expect(result.places[0]).toMatchObject({
      id: "g:ios",
      lat: 35.6,
      lng: 139.7,
    });
    expect(result.places[0]?.visits[0]?.localMinute).toBe(600);
  });

  it("treats a missing semantic type as unknown", () => {
    const seg = segment("x", "2024-01-01T10:00:00Z", "2024-01-01T11:00:00Z");
    delete (seg.visit.topCandidate as Record<string, unknown>).semanticType;
    expect(parseTimeline({ semanticSegments: [seg] }).places).toHaveLength(1);
  });

  it("rejects unknown shapes", () => {
    expect(() => parseTimeline({ timelineObjects: [] })).toThrow(
      /Unrecognised/,
    );
    expect(() => parseTimeline({ semanticSegments: "no" })).toThrow(
      /Unrecognised/,
    );
    expect(() => parseTimeline(null)).toThrow(/Unrecognised/);
  });
});
