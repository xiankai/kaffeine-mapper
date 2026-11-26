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

describe("merging check-ins with Timeline imports", () => {
  const checkin = (start: string) => ({
    ...visit(start, 0),
    source: "checkin" as const,
  });

  it("replaces a check-in within two hours of an imported visit at the same place", () => {
    const base = ds(
      place({
        id: "g:a",
        visits: [
          checkin("2026-11-20T09:30:00.000Z"),
          checkin("2026-11-20T11:00:00.000Z"),
          checkin("2026-11-24T10:00:00.000Z"),
        ],
      }),
    );
    const summary = mergeIntoDataset(base, [
      place({ id: "g:a", visits: [visit("2026-11-20T10:00:00.000Z", 45)] }),
    ]);
    expect(summary.dataset.places[0]?.visits.map((v) => v.start)).toEqual([
      "2026-11-20T10:00:00.000Z",
      "2026-11-24T10:00:00.000Z",
    ]);
    expect(summary.newVisits).toBe(1);
  });

  it("keeps a check-in that no imported visit overlaps, or at another place", () => {
    const base = ds(
      place({ id: "g:a", visits: [checkin("2026-11-20T13:00:00.000Z")] }),
      place({ id: "g:b", visits: [checkin("2026-11-20T10:00:00.000Z")] }),
    );
    const summary = mergeIntoDataset(base, [
      place({ id: "g:a", visits: [visit("2026-11-20T10:00:00.000Z", 30)] }),
    ]);
    expect(summary.dataset.places.map((p) => p.visits.length)).toEqual([2, 1]);
  });

  it("keeps evaluations from both sides when places are folded together", () => {
    const merged = mergePlace(
      place({ evaluations: [{ at: "2026-11-02", rating: 4 }] }),
      place({
        evaluations: [
          { at: "2026-11-01", wifi: "ok" },
          { at: "2026-11-02", rating: 2 },
        ],
      }),
    );
    expect(merged.evaluations).toEqual([
      { at: "2026-11-01", wifi: "ok" },
      { at: "2026-11-02", rating: 4 },
    ]);
    expect(mergePlace(place(), place()).evaluations).toBeUndefined();
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

describe("merging review decisions", () => {
  const owner = place({ review: "not-cafe", reviewBy: "owner" });
  const auto = place({ review: "cafe", reviewBy: "auto" });
  const unsure = place({ review: "pending", reviewBy: "owner" });
  const untouched = place();

  it("lets a hand decision beat an automatic one, which beats none", () => {
    expect(mergePlace(auto, owner)).toMatchObject({
      review: "not-cafe",
      reviewBy: "owner",
    });
    expect(mergePlace(untouched, auto)).toMatchObject({
      review: "cafe",
      reviewBy: "auto",
    });
    expect(mergePlace(auto, unsure)).toMatchObject({
      review: "pending",
      reviewBy: "owner",
    });
    const legacy = mergePlace(place({ review: "cafe" }), unsure);
    expect(legacy.review).toBe("cafe");
    expect(legacy.reviewBy).toBeUndefined();
  });
});
