import { get, set } from "idb-keyval";
import {
  commonsThumb,
  entityUrl,
  loadLogo,
  logoFromResponse,
  logoKey,
  resolveLogo,
} from "../brandLogos";

jest.mock("idb-keyval", () => ({
  get: jest.fn(async () => undefined),
  set: jest.fn(async () => undefined),
}));

const reply = (body: unknown, ok = true) =>
  jest.fn(
    async () =>
      ({ ok, status: ok ? 200 : 503, json: async () => body }) as Response,
  );

const claim = (value: string, rank = "normal") => ({
  rank,
  mainsnak: { datavalue: { value } },
});

const entity = (claims: unknown[]) => ({
  entities: { Q37158: { claims: { P154: claims } } },
});

describe("logoFromResponse", () => {
  it("prefers a preferred logo and skips deprecated ones", () => {
    expect(
      logoFromResponse(
        entity([
          claim("Old.svg", "deprecated"),
          claim("Plain.png"),
          claim("Best logo.svg", "preferred"),
        ]) as never,
      ),
    ).toBe(commonsThumb("Best logo.svg"));
    expect(commonsThumb("Best logo.svg")).toBe(
      "https://commons.wikimedia.org/wiki/Special:FilePath/Best%20logo.svg?width=64",
    );
  });

  it("reports no logo for missing entities or claims", () => {
    expect(logoFromResponse({ error: { code: "no-such-entity" } })).toBeNull();
    expect(logoFromResponse({ entities: { Q1: { missing: "" } } })).toBeNull();
    expect(logoFromResponse({ entities: {} })).toBeNull();
    expect(logoFromResponse({ entities: { Q1: {} } })).toBeNull();
    expect(
      logoFromResponse(entity([{ rank: "normal", mainsnak: {} }]) as never),
    ).toBeNull();
  });

  it("rejects replies it can't read", () => {
    expect(() => logoFromResponse({ error: { code: "maxlag" } })).toThrow();
    expect(() => logoFromResponse({})).toThrow();
  });
});

describe("resolveLogo", () => {
  const store = () => ({
    load: jest.fn(async () => undefined as string | null | undefined),
    save: jest.fn(async () => undefined),
  });

  it("asks Wikidata once and caches the answer, including no logo", async () => {
    const s = store();
    const fetchImpl = reply(entity([claim("Logo.png")]));
    expect(await resolveLogo("Q37158", fetchImpl, s)).toBe(
      commonsThumb("Logo.png"),
    );
    expect(fetchImpl).toHaveBeenCalledWith(entityUrl("Q37158"));
    expect(entityUrl("Q37158")).toContain("origin=*");
    expect(s.save).toHaveBeenCalledWith(
      logoKey("Q37158"),
      commonsThumb("Logo.png"),
    );
    const none = store();
    expect(
      await resolveLogo(
        "Q1",
        reply({ error: { code: "no-such-entity" } }),
        none,
      ),
    ).toBeNull();
    expect(none.save).toHaveBeenCalledWith(logoKey("Q1"), null);
  });

  it("uses the cache, including a cached absence", async () => {
    const fetchImpl = reply({});
    const s = store();
    s.load.mockResolvedValueOnce(null);
    expect(await resolveLogo("Q1", fetchImpl, s)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("caches nothing when the lookup fails or storage breaks", async () => {
    const s = store();
    expect(await resolveLogo("Q1", reply({}, false), s)).toBeUndefined();
    const offline = jest.fn(async () => {
      throw new Error("offline");
    });
    expect(await resolveLogo("Q1", offline, s)).toBeUndefined();
    expect(s.save).not.toHaveBeenCalled();
    const broken = {
      load: jest.fn(async () => {
        throw new Error("blocked");
      }),
      save: jest.fn(async () => {
        throw new Error("blocked");
      }),
    };
    expect(
      await resolveLogo("Q1", reply(entity([claim("L.png")])), broken),
    ).toBe(commonsThumb("L.png"));
  });
});

describe("loadLogo", () => {
  it("shares a request per Q-id and retries after a failure", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({
        ok: true,
        json: async () => entity([claim("Logo.png")]),
      } as Response);
    const first = loadLogo("Q37158");
    expect(loadLogo("Q37158")).toBe(first);
    expect(await first).toBeUndefined();
    expect(await loadLogo("Q37158")).toBe(commonsThumb("Logo.png"));
    expect(await loadLogo("Q37158")).toBe(commonsThumb("Logo.png"));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith(logoKey("Q37158"));
    expect(set).toHaveBeenCalledWith(
      logoKey("Q37158"),
      commonsThumb("Logo.png"),
    );
    fetchSpy.mockRestore();
  });
});
