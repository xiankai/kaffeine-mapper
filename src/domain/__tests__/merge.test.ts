import { osm, place, visit } from "../../test/fixtures";
import { linkByOsm, mergeIntoDataset, mergePlace, updatePlace } from "../merge";
import { Dataset } from "../types";

const ds = (...places: Dataset["places"]): Dataset => ({ version: 1, places });

describe("mergePlace", () => {
  it("unions sources, lists and visits while keeping the existing user data", () => {
    const existing = place({
      visits: [visit("a")],
      manual: { sockets: "many" },
      review: "cafe",
      lists: ["L1"],
    });
    const incoming = place({
      visits: [visit("a"), visit("b")],
      manual: { wifi: "ok", sockets: "none" },
      lists: ["L2"],
      sources: ["saved"],
      review: "pending",
    });
    const merged = mergePlace(existing, incoming);
    expect(merged.visits.map((v) => v.start)).toEqual(["a", "b"]);
    expect(merged.manual).toEqual({ wifi: "ok", sockets: "many" });
    expect(merged.review).toBe("cafe");
    expect(merged.lists).toEqual(["L1", "L2"]);
    expect(merged.sources).toEqual(["timeline", "saved"]);
  });

  it("takes coordinates from whichever side is located and the incoming review when pending", () => {
    const merged = mergePlace(
      place({ located: false, lat: 0, lng: 0 }),
      place({ lat: 1, lng: 2, review: "cafe" }),
    );
    expect(merged).toMatchObject({
      located: true,
      lat: 1,
      lng: 2,
      review: "cafe",
    });
  });
});

describe("mergeIntoDataset", () => {
  it("adds, updates and counts new visits, resolving aliases", () => {
    const base = ds(
      place({ id: "g:a", visits: [visit("1")] }),
      place({ id: "g:b", aliases: ["b:url"] }),
    );
    const summary = mergeIntoDataset(base, [
      place({ id: "g:a", visits: [visit("1"), visit("2")] }),
      place({ id: "b:url", lists: ["Want"] }),
      place({ id: "g:c", visits: [visit("3")] }),
    ]);
    expect(summary).toMatchObject({ added: 1, updated: 2, newVisits: 2 });
    expect(summary.dataset.places.find((p) => p.id === "g:b")?.lists).toEqual([
      "Want",
    ]);
  });
});

describe("linkByOsm", () => {
  it("folds places sharing an OSM match into the most visited one and records aliases", () => {
    const linked = linkByOsm(
      ds(
        place({
          id: "b:1",
          lists: ["Want"],
          name: "Kiln",
          sources: ["saved"],
          osm: osm({}, "node/9"),
          aliases: ["b:0"],
        }),
        place({ id: "g:1", visits: [visit("x")], osm: osm({}, "node/9") }),
        place({ id: "g:2", osm: osm({}, "node/10") }),
        place({ id: "g:3", review: "not-cafe", osm: osm({}, "node/9") }),
        place({ id: "g:4" }),
      ),
    );
    expect(linked.places.map((p) => p.id)).toEqual([
      "g:1",
      "g:2",
      "g:3",
      "g:4",
    ]);
    expect(linked.places[0]).toMatchObject({
      name: "Kiln",
      lists: ["Want"],
      aliases: ["b:1", "b:0"],
    });
  });

  it("prefers located survivors when visit counts tie", () => {
    const linked = linkByOsm(
      ds(
        place({ id: "a", located: false, osm: osm() }),
        place({ id: "b", osm: osm() }),
      ),
    );
    expect(linked.places[0]?.id).toBe("b");
  });
});

describe("updatePlace", () => {
  it("changes only the matching place", () => {
    const updated = updatePlace(
      ds(place({ id: "a" }), place({ id: "b" })),
      "b",
      (p) => ({ ...p, review: "cafe" }),
    );
    expect(updated.places.map((p) => p.review)).toEqual(["pending", "cafe"]);
  });
});
