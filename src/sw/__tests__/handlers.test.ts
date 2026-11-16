import { FakeCache, FakeCaches } from "../../test/fakeCaches";
import { takeShared } from "../../services/shareInbox";
import {
  isAppRequest,
  isShareTarget,
  precacheShell,
  receiveShare,
  respond,
  shellAssets,
  staleCaches,
} from "../handlers";

const SCOPE = "https://example.test/kaffeine-mapper/";
const SHELL = `<link rel="manifest" href="/kaffeine-mapper/manifest.webmanifest" />
<link rel="icon" href="./icons/icon.svg" />
<a href="#top"></a><a href="https://elsewhere.test/x"></a><img src="//cdn.test/y">
<script type="module" src="./assets/js/index-1.js"></script>
<link rel="stylesheet" href="./assets/css/index-1.css">`;

const fetchReturning = (response: () => Response) =>
  jest.fn(async () => response()) as unknown as typeof fetch;

const navigate = (url: string) => {
  const request = new Request(url);
  Object.defineProperty(request, "mode", { value: "navigate" });
  return request;
};

describe("shellAssets", () => {
  it("keeps same-site refs and drops anchors, absolute and protocol-relative ones", () => {
    expect(shellAssets(SHELL)).toEqual([
      "./assets/css/index-1.css",
      "./assets/js/index-1.js",
      "./icons/icon.svg",
      "/kaffeine-mapper/manifest.webmanifest",
    ]);
  });
});

describe("precacheShell", () => {
  it("caches the shell, what it links and the bundled chunks", async () => {
    const cache = new FakeCache();
    await precacheShell(
      cache as unknown as Cache,
      SCOPE,
      fetchReturning(() => new Response(SHELL)),
      ["assets/js/MapPanel-1.js", "assets/js/index-1.js"],
    );
    expect([...cache.entries.keys()].sort()).toEqual([
      SCOPE,
      `${SCOPE}assets/css/index-1.css`,
      `${SCOPE}assets/js/MapPanel-1.js`,
      `${SCOPE}assets/js/index-1.js`,
      `${SCOPE}icons/icon.svg`,
      `${SCOPE}manifest.webmanifest`,
    ]);
  });

  it("fails the install when the shell can't be fetched", async () => {
    await expect(
      precacheShell(
        new FakeCache() as unknown as Cache,
        SCOPE,
        fetchReturning(() => new Response("", { status: 404 })),
      ),
    ).rejects.toThrow("App shell returned 404");
  });
});

describe("request routing", () => {
  it("recognises the share POST and same-scope GETs", () => {
    const share = new Request(`${SCOPE}share-target`, { method: "POST" });
    expect(isShareTarget(share, SCOPE)).toBe(true);
    expect(isShareTarget(new Request(`${SCOPE}share-target`), SCOPE)).toBe(
      false,
    );
    expect(isAppRequest(new Request(`${SCOPE}assets/a.js`), SCOPE)).toBe(true);
    expect(isAppRequest(share, SCOPE)).toBe(false);
    expect(isAppRequest(new Request("https://overpass.test/api"), SCOPE)).toBe(
      false,
    );
  });

  it("drops only older app caches", () => {
    expect(
      staleCaches(
        ["kaffeine-app-1", "kaffeine-app-2", "kaffeine-share-inbox"],
        "kaffeine-app-2",
      ),
    ).toEqual(["kaffeine-app-1"]);
  });
});

describe("receiveShare", () => {
  it("stashes the share and redirects to the import page", async () => {
    const caches = new FakeCaches();
    const body = new FormData();
    body.append("text", "Kiln https://maps.app.goo.gl/z");
    const request = new Request(`${SCOPE}share-target`, {
      method: "POST",
      body,
    });
    const response = await receiveShare(request, caches, SCOPE);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SCOPE}#/import`);
    expect((await takeShared(caches)).links).toEqual([
      { text: "Kiln https://maps.app.goo.gl/z" },
    ]);
  });
});

describe("respond", () => {
  it("serves assets from the cache first and caches misses", async () => {
    const cache = new FakeCache();
    const fetchImpl = fetchReturning(() => new Response("fresh"));
    const asset = new Request(`${SCOPE}assets/a.js`);
    const first = await respond(
      asset,
      cache as unknown as Cache,
      SCOPE,
      fetchImpl,
    );
    expect(await first.text()).toBe("fresh");
    const second = await respond(
      asset,
      cache as unknown as Cache,
      SCOPE,
      fetchImpl,
    );
    expect(await second.text()).toBe("fresh");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("doesn't cache failed asset fetches", async () => {
    const cache = new FakeCache();
    await respond(
      new Request(`${SCOPE}missing.js`),
      cache as unknown as Cache,
      SCOPE,
      fetchReturning(() => new Response("", { status: 404 })),
    );
    expect(cache.entries.size).toBe(0);
  });

  it("prefers the network for navigations and falls back to the cached shell", async () => {
    const cache = new FakeCache();
    const online = await respond(
      navigate(SCOPE),
      cache as unknown as Cache,
      SCOPE,
      fetchReturning(() => new Response("shell v2")),
    );
    expect(await online.text()).toBe("shell v2");

    const offline = jest.fn(async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    const fallback = await respond(
      navigate(SCOPE),
      cache as unknown as Cache,
      SCOPE,
      offline,
    );
    expect(await fallback.text()).toBe("shell v2");

    const empty = await respond(
      navigate(SCOPE),
      new FakeCache() as unknown as Cache,
      SCOPE,
      offline,
    );
    expect(empty.type).toBe("error");
  });

  it("leaves the cached shell alone when a navigation fails", async () => {
    const cache = new FakeCache();
    await cache.put(SCOPE, new Response("shell v1"));
    await respond(
      navigate(SCOPE),
      cache as unknown as Cache,
      SCOPE,
      fetchReturning(() => new Response("", { status: 500 })),
    );
    expect(await (await cache.match(SCOPE))?.text()).toBe("shell v1");
  });
});
