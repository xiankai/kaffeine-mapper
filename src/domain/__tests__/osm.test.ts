import {
  buildOverpassQuery,
  cellBBox,
  cellKey,
  distanceM,
  matchNearest,
  nameSimilarity,
  normaliseName,
} from "../osm";

describe("cells and query", () => {
  it("maps points to padded cell boxes and builds a bbox query", () => {
    const key = cellKey({ lat: 51.51, lng: -0.13 });
    expect(key).toBe("257:-1");
    const box = cellBBox(key);
    expect(box.south).toBeCloseTo(51.398);
    expect(box.east).toBeCloseTo(0.002);
    const q = buildOverpassQuery([box]);
    expect(q).toContain(
      'nwr["amenity"="cafe"](51.39800,-0.20200,51.60200,0.00200);',
    );
    expect(q).toContain('["shop"="coffee"]');
    expect(q).toMatch(/out center tags;$/);
  });
});

describe("names", () => {
  it("normalises accents, ampersands and punctuation", () => {
    expect(normaliseName("Café & Bar!")).toBe("cafe and bar");
  });

  it("scores word overlap", () => {
    expect(nameSimilarity("Kiln Coffee", "kiln")).toBe(1);
    expect(nameSimilarity("A", "B")).toBe(0);
    expect(nameSimilarity(undefined, "B")).toBe(0);
    expect(nameSimilarity("!!", "B")).toBe(0);
  });
});

describe("matchNearest", () => {
  const here = { lat: 51.5, lng: -0.12 };
  const elements = [
    {
      type: "node",
      id: 1,
      lat: 51.5002,
      lon: -0.12,
      tags: {
        name: "Far Cafe",
        amenity: "cafe",
        "socket:usb": "2",
        fixme: "x",
      },
    },
    {
      type: "way",
      id: 2,
      center: { lat: 51.50005, lon: -0.12 },
      tags: { name: "Near Cafe", brand: "Chain" },
    },
    { type: "node", id: 3, lat: 52, lon: 0 },
    { type: "relation", id: 4 },
  ];

  it("picks the nearest element within the radius and keeps useful tags", () => {
    expect(matchNearest(here, elements, 40)).toEqual({
      id: "way/2",
      name: "Near Cafe",
      distanceM: 6,
      tags: { name: "Near Cafe", brand: "Chain" },
    });
  });

  it("lets a matching name beat a closer element", () => {
    const match = matchNearest(here, elements, 40, "Far Cafe");
    expect(match?.id).toBe("node/1");
    expect(match?.tags).toEqual({
      name: "Far Cafe",
      amenity: "cafe",
      "socket:usb": "2",
    });
  });

  it("returns undefined when nothing is close, and handles untagged elements", () => {
    expect(matchNearest(here, elements, 2)).toBeUndefined();
    expect(matchNearest({ lat: 52, lng: 0 }, elements, 10)).toEqual({
      id: "node/3",
      distanceM: 0,
      tags: {},
    });
  });

  it("measures distance in metres", () => {
    expect(distanceM(here, { lat: 51.501, lng: -0.12 })).toBeCloseTo(111, 0);
  });
});
