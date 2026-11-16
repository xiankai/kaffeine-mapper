import { FakeCaches } from "../../test/fakeCaches";
import { INBOX_CACHE, stashShare, takeShared } from "../shareInbox";

const BASE = "https://example.test/app/";

function form(entries: [string, string | File][]) {
  const data = new FormData();
  entries.forEach(([key, value]) => data.append(key, value));
  return data;
}

describe("share inbox", () => {
  it("stashes shared files and a link, then hands them over once", async () => {
    const caches = new FakeCaches();
    const stored = await stashShare(
      form([
        [
          "files",
          new File(['{"semanticSegments":[]}'], "Timeline.json", {
            type: "application/json",
          }),
        ],
        ["files", new File(["Title,URL\n"], "Want to go.csv")],
        ["text", "Blue Door\nhttps://maps.app.goo.gl/x"],
        ["title", " "],
      ]),
      caches,
      BASE,
      7,
    );
    expect(stored).toBe(3);
    expect([...(caches.stores.get(INBOX_CACHE)?.entries.keys() ?? [])]).toEqual(
      [
        `${BASE}share-inbox/7-0`,
        `${BASE}share-inbox/7-1`,
        `${BASE}share-inbox/7-2`,
      ],
    );

    const items = await takeShared(caches);
    expect(items.files.map((f) => f.name)).toEqual([
      "Timeline.json",
      "Want to go.csv",
    ]);
    expect(await items.files[0]?.text()).toBe('{"semanticSegments":[]}');
    expect(items.links).toEqual([
      { text: "Blue Door\nhttps://maps.app.goo.gl/x" },
    ]);
    expect(await takeShared(caches)).toEqual({ files: [], links: [] });
  });

  it("stores a link-only share with title and url", async () => {
    const caches = new FakeCaches();
    await stashShare(
      form([
        ["title", "Kiln"],
        ["url", "https://maps.app.goo.gl/y"],
      ]),
      caches,
      BASE,
    );
    expect((await takeShared(caches)).links).toEqual([
      { title: "Kiln", url: "https://maps.app.goo.gl/y" },
    ]);
  });

  it("stores nothing for an empty share and ignores foreign entries", async () => {
    const caches = new FakeCaches();
    expect(await stashShare(form([]), caches, BASE)).toBe(0);
    const cache = await caches.open(INBOX_CACHE);
    await cache.put(`${BASE}other`, new Response("x"));
    expect(await takeShared(caches)).toEqual({ files: [], links: [] });
  });

  it("returns nothing when the Cache API is missing", async () => {
    expect(await takeShared(undefined)).toEqual({ files: [], links: [] });
  });
});
