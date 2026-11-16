import { isTimelineJson, placeFromSharedLink, SHARED_LIST } from "../share";

describe("placeFromSharedLink", () => {
  it("takes the name from the text and the Maps short link from the text", () => {
    const shared = placeFromSharedLink({
      text: "Blue Door Coffee\nhttps://maps.app.goo.gl/abc123",
    });
    expect(shared).toMatchObject({
      id: "b:share:https://maps.app.goo.gl/abc123",
      name: "Blue Door Coffee",
      url: "https://maps.app.goo.gl/abc123",
      located: false,
      sources: ["saved"],
      lists: [SHARED_LIST],
      review: "pending",
    });
  });

  it("prefers the title and locates a link that carries coordinates", () => {
    const shared = placeFromSharedLink({
      title: " Kiln ",
      text: "ignored",
      url: "https://www.google.com/maps/place/Kiln/@51.5,-0.12,17z",
    });
    expect(shared).toMatchObject({
      name: "Kiln",
      lat: 51.5,
      lng: -0.12,
      located: true,
    });
  });

  it("falls back to the name in a full Maps link", () => {
    expect(
      placeFromSharedLink({
        text: "https://www.google.com/maps/place/Monmouth+Coffee/",
      })?.name,
    ).toBe("Monmouth Coffee");
  });

  it("keeps a name with no link and drops an empty share", () => {
    expect(placeFromSharedLink({ text: "Corner café" })).toMatchObject({
      id: "b:share:Corner café",
      located: false,
    });
    expect(placeFromSharedLink({ text: "  " })).toBeUndefined();
  });
});

describe("isTimelineJson", () => {
  it("spots a Timeline export by its segments key", () => {
    expect(isTimelineJson('{"semanticSegments": []}')).toBe(true);
    expect(isTimelineJson('{"type": "FeatureCollection"}')).toBe(false);
  });
});
