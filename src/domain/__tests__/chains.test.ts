import { osm, place } from "../../test/fixtures";
import {
  chainDefaultsOf,
  chainKey,
  groupByChain,
  inheritManual,
  updateChain,
  withChainDefaults,
} from "../chains";
import { chainNameCounts } from "../insights";

const doutor = (id: string, tags: Record<string, string>) =>
  place({ id, osm: osm({ name: `Doutor ${id}`, ...tags }, `node/${id}`) });

describe("chainKey", () => {
  const tagged = doutor("1", {
    brand: "Doutor",
    "brand:wikidata": "Q11322787",
  });
  const brandOnly = doutor("2", { brand: "DOUTOR" });
  const repeated = ["a", "b", "c"].map((id) =>
    place({ id, osm: osm({ name: "Tully's Coffee" }, `node/${id}`) }),
  );
  const loner = place({ id: "x", osm: osm({ name: "Kiln" }) });
  const all = [tagged, brandOnly, ...repeated, loner];
  const counts = chainNameCounts(all);

  it("keys tagged and untagged branches by their normalised brand", () => {
    expect(chainKey(tagged, counts)).toBe("doutor");
    expect(chainKey(brandOnly, counts)).toBe("doutor");
    expect(chainKey(repeated[0]!, counts)).toBe("tully s coffee");
  });

  it("has no key for independents, owner overrides or empty names", () => {
    expect(chainKey(loner, counts)).toBeUndefined();
    expect(
      chainKey({ ...tagged, manual: { chain: false } }, counts),
    ).toBeUndefined();
    expect(
      chainKey(place({ name: "Mine", manual: { chain: true } }), counts),
    ).toBe("mine");
    expect(
      chainKey(place({ manual: { chain: true } }), counts),
    ).toBeUndefined();
    expect(
      chainKey(place({ osm: osm({ brand: "☕" }) }), counts),
    ).toBeUndefined();
  });

  it("groups branches in order and leaves single branches as places", () => {
    const items = all.map((p) => ({ place: p }));
    const entries = groupByChain(items, counts);
    expect(
      entries.map((e) =>
        e.kind === "chain"
          ? `${e.label}×${e.branches.length}`
          : e.item.place.id,
      ),
    ).toEqual(["Doutor×2", "Tully's Coffee×3", "x"]);
    const one = groupByChain([{ place: tagged }], counts);
    expect(one).toEqual([{ kind: "place", item: { place: tagged } }]);
  });
});

describe("inheritManual", () => {
  const chain = {
    sockets: "many" as const,
    wifi: "ok" as const,
    wifiLimitMinutes: 60,
    rating: 3,
    seats: {
      "weekday-morning": "easy" as const,
      "weekend-evening": "hard" as const,
    },
    notes: "chain note",
    chain: true,
  };

  it("fills each missing field and seat from the chain", () => {
    const out = inheritManual(
      {
        sockets: "few",
        wifiLimitMinutes: null,
        seats: { "weekday-morning": "ok" },
        notes: "mine",
      },
      chain,
    );
    expect(out.manual).toEqual({
      sockets: "few",
      wifi: "ok",
      wifiLimitMinutes: null,
      rating: 3,
      seats: { "weekday-morning": "ok", "weekend-evening": "hard" },
      notes: "mine",
    });
    expect(out.inherited).toEqual(["wifi", "rating", "weekend-evening"]);
  });

  it("keeps the branch's own values when nothing is inherited", () => {
    const own = { sockets: "none" as const };
    expect(inheritManual(own, undefined)).toEqual({
      manual: own,
      inherited: [],
    });
    expect(inheritManual(own, { sockets: "many" })).toEqual({
      manual: own,
      inherited: [],
    });
  });
});

describe("chain defaults", () => {
  const branch = place({ osm: osm({ brand: "Doutor" }) });
  const counts = chainNameCounts([branch]);
  const chains = { doutor: { manual: { wifi: "strong" as const } } };

  it("applies defaults only to branches of a known chain", () => {
    expect(chainDefaultsOf(branch, counts, chains)).toBe(chains.doutor);
    expect(withChainDefaults(branch, counts, chains).manual.wifi).toBe(
      "strong",
    );
    const loner = place({ osm: osm({ name: "Kiln" }) });
    expect(withChainDefaults(loner, counts, chains)).toBe(loner);
    expect(chainDefaultsOf(branch, counts, undefined)).toBeUndefined();
  });

  it("creates and updates a chain's defaults", () => {
    const created = updateChain({ version: 1, places: [] }, "doutor", (d) => ({
      ...d,
      manual: { ...d.manual, sockets: "few" },
    }));
    expect(created.chains).toEqual({ doutor: { manual: { sockets: "few" } } });
    const updated = updateChain(created, "doutor", (d) => ({
      ...d,
      manual: { ...d.manual, rating: 4 },
    }));
    expect(updated.chains?.doutor?.manual).toEqual({
      sockets: "few",
      rating: 4,
    });
  });
});
