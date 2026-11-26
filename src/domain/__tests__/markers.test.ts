import { osm, place, visit } from "../../test/fixtures";
import { chainNameCounts } from "../insights";
import {
  chainMark,
  chainWikidata,
  initialsOf,
  markerKey,
  markerSpec,
} from "../markers";

const branch = (id: string, tags: Record<string, string>) =>
  place({ id, review: "cafe", osm: osm({ brand: "Doutor", ...tags }, id) });

describe("chainWikidata", () => {
  it("maps each chain to its most common valid Q-id", () => {
    const places = [
      branch("a", { "brand:wikidata": "Q2" }),
      branch("b", { "brand:wikidata": "Q1" }),
      branch("c", { "brand:wikidata": "Q2" }),
      branch("d", { "brand:wikidata": "not-a-qid" }),
      branch("e", {}),
      place({ id: "f", osm: osm({ "brand:wikidata": "Q9" }) }),
    ];
    const qids = chainWikidata(places, chainNameCounts(places));
    expect([...qids.entries()]).toEqual([["doutor", "Q2"]]);
  });

  it("breaks a tie by the lower Q-id string", () => {
    const places = [
      branch("a", { "brand:wikidata": "Q7" }),
      branch("b", { "brand:wikidata": "Q3" }),
    ];
    expect(chainWikidata(places, chainNameCounts(places)).get("doutor")).toBe(
      "Q3",
    );
  });
});

describe("initialsOf", () => {
  it("takes two words' first letters, or the first two characters", () => {
    expect(initialsOf("blue bottle coffee")).toBe("BB");
    expect(initialsOf("Doutor")).toBe("DO");
    expect(initialsOf("ドトール")).toBe("ドト");
    expect(initialsOf("  ")).toBe("?");
  });
});

describe("markerSpec", () => {
  const counts = new Map([["doutor", 3]]);
  const qids = new Map([["doutor", "Q2"]]);
  const logo = "https://logo/x.png";

  it("draws a logo, initials, a cup or a dot", () => {
    const tagged = branch("a", {});
    const visited = { ...tagged, visits: [visit("2026-01-01")] };
    expect(
      markerSpec(
        visited,
        "#f00",
        chainMark(visited, counts, qids, { Q2: logo }),
      ),
    ).toEqual({
      kind: "logo",
      ring: "#f00",
      visited: true,
      initials: "DO",
      logo,
    });
    expect(
      markerSpec(tagged, "#f00", chainMark(tagged, counts, qids, { Q2: null })),
    ).toEqual({
      kind: "initials",
      ring: "#f00",
      visited: false,
      initials: "DO",
    });
    expect(
      markerSpec(tagged, "#f00", chainMark(tagged, counts, new Map(), {})).kind,
    ).toBe("initials");
    const cafe = place({ review: "cafe", osm: osm({ name: "Kiln" }) });
    expect(chainMark(cafe, counts, qids, {})).toBeUndefined();
    expect(markerSpec(cafe, "#0f0", undefined).kind).toBe("cafe");
    expect(
      markerSpec({ ...tagged, review: "pending" }, "#0f0", undefined),
    ).toEqual({ kind: "dot", ring: "#0f0", visited: false });
  });

  it("marks a chain the owner named without a Q-id", () => {
    const mine = place({ review: "cafe", manual: { chain: true }, name: "X" });
    expect(chainMark(mine, new Map(), new Map(), {})).toEqual({ label: "X" });
  });

  it("keys identical specs identically", () => {
    const spec = markerSpec(place(), "#000", undefined);
    expect(markerKey(spec)).toBe(markerKey({ ...spec }));
  });
});
