import {
  coordsFromMapsUrl,
  nameFromMapsUrl,
  parseCsv,
  parseSavedCsv,
  parseStarredGeoJson,
} from "../bookmarks";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,"b, c","say ""hi"""\r\nd,e,f')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["d", "e", "f"],
    ]);
  });

  it("keeps a trailing row without newline and empty lines", () => {
    expect(parseCsv("a\n\nb")).toEqual([["a"], [""], ["b"]]);
  });
});

describe("maps URLs", () => {
  it("extracts coordinates from the common URL shapes", () => {
    expect(
      coordsFromMapsUrl(
        "https://www.google.com/maps/place/X/data=!3d1.25!4d103.5",
      ),
    ).toEqual({ lat: 1.25, lng: 103.5 });
    expect(
      coordsFromMapsUrl("https://www.google.com/maps/place/X/@51.5,-0.1,17z"),
    ).toEqual({ lat: 51.5, lng: -0.1 });
    expect(coordsFromMapsUrl("https://maps.google.com/?q=40.7,-74.0")).toEqual({
      lat: 40.7,
      lng: -74,
    });
    expect(
      coordsFromMapsUrl("https://www.google.com/maps/search/35.6,+139.7"),
    ).toEqual({ lat: 35.6, lng: 139.7 });
    expect(
      coordsFromMapsUrl(
        "https://www.google.com/maps/place/X/data=!4m2!3m1!1s0x1:0x2",
      ),
    ).toBeUndefined();
  });

  it("extracts the place name", () => {
    expect(
      nameFromMapsUrl(
        "https://www.google.com/maps/place/Caf%C3%A9+Nero/data=x",
      ),
    ).toBe("Café Nero");
    expect(
      nameFromMapsUrl("https://www.google.com/maps/place/+/data=x"),
    ).toBeUndefined();
    expect(nameFromMapsUrl("https://example.com")).toBeUndefined();
  });
});

describe("parseSavedCsv", () => {
  const csv = [
    "Places for laptop work",
    "",
    "Title,Note,URL,Tags,Comment",
    'Bean There,"good wifi","https://www.google.com/maps/place/Bean+There/@51.5,-0.1,17z",,',
    ",,https://www.google.com/maps/place/Url+Only/data=!4m2,,try",
    "Name Only,,,,",
    ",,,,",
  ].join("\n");

  it("skips the description, reads rows and builds bookmarks", () => {
    const places = parseSavedCsv(csv, "Laptop");
    expect(places).toHaveLength(3);
    expect(places[0]).toMatchObject({
      name: "Bean There",
      located: true,
      lat: 51.5,
      lists: ["Laptop"],
      sources: ["saved"],
      googleNote: "good wifi",
    });
    expect(places[1]).toMatchObject({
      name: "Url Only",
      located: false,
      googleNote: "try",
    });
    expect(places[2]).toMatchObject({
      id: "b:Laptop:Name Only",
      name: "Name Only",
      located: false,
    });
    expect(places[2]?.url).toBeUndefined();
  });

  it("rejects files without the header", () => {
    expect(() => parseSavedCsv("a,b\n1,2", "X")).toThrow(/Title\/URL/);
  });
});

describe("parseStarredGeoJson", () => {
  it("reads properties-wrapped and flat features", () => {
    const places = parseStarredGeoJson({
      type: "FeatureCollection",
      features: [
        {
          geometry: { type: "Point", coordinates: [-0.1, 51.5] },
          properties: {
            google_maps_url: "https://maps.google.com/?cid=1",
            location: { name: "Kiln", address: "1 Road" },
            five_star_rating_published: 5,
            review_text_published: "great",
          },
        },
        {
          geometry: { coordinates: [0, 0] },
          google_maps_url: "https://www.google.com/maps/place/Flat+One/x",
          location: [{ address: "2 Road" }],
          five_star_rating_draft: 3,
          review_text_draft: "draft",
        },
        { geometry: { coordinates: [1, 2] }, properties: {} },
        { geometry: { coordinates: "bad" }, properties: {} },
        { properties: { location: [] } },
      ],
    });
    expect(places).toHaveLength(3);
    expect(places[0]).toMatchObject({
      name: "Kiln",
      address: "1 Road",
      googleRating: 5,
      googleNote: "great",
      located: true,
      sources: ["starred"],
      lists: ["Starred places"],
    });
    expect(places[1]).toMatchObject({
      name: "Flat One",
      located: false,
      googleRating: 3,
      googleNote: "draft",
      address: "2 Road",
    });
    expect(places[2]).toMatchObject({
      id: "b:Starred places:2,1",
      located: true,
    });
  });

  it("rejects non-GeoJSON", () => {
    expect(() => parseStarredGeoJson({})).toThrow(/GeoJSON/);
  });
});
