type Module = typeof import("../googleMaps");

interface TestWindow {
  google?: unknown;
  kaffeineMapsReady?: () => void;
}

const testWindow = () => window as unknown as TestWindow;

function freshModule(): Module {
  let loaded: Module | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<Module>("../googleMaps");
  });
  return loaded!;
}

function captureScripts() {
  const scripts: HTMLScriptElement[] = [];
  jest
    .spyOn(document.head, "append")
    .mockImplementation((...nodes) =>
      nodes.forEach((n) => scripts.push(n as HTMLScriptElement)),
    );
  return scripts;
}

function installMaps(types: string[] | undefined) {
  const fetchFields = jest.fn(async () => undefined);
  const Place = jest.fn(function (this: { types?: string[] }) {
    if (types) this.types = types;
    return Object.assign(this, { fetchFields });
  });
  const importLibrary = jest.fn(async () => ({ Place }));
  testWindow().google = { maps: { importLibrary } };
  return { Place, fetchFields, importLibrary };
}

afterEach(() => {
  jest.restoreAllMocks();
  delete testWindow().google;
  delete testWindow().kaffeineMapsReady;
});

describe("googleMaps", () => {
  it("loads the script once and fetches only the types field", async () => {
    const scripts = captureScripts();
    const maps = freshModule();
    const { Place, fetchFields, importLibrary } = installMaps(["cafe"]);
    const first = maps.fetchPlaceTypes("KEY", "abc");
    const second = maps.loadMaps("KEY");
    testWindow().kaffeineMapsReady!();
    expect(await first).toEqual(["cafe"]);
    await second;
    expect(scripts).toHaveLength(1);
    const url = new URL(scripts[0]!.src);
    expect(url.origin + url.pathname).toBe(
      "https://maps.googleapis.com/maps/api/js",
    );
    expect(url.searchParams.get("key")).toBe("KEY");
    expect(url.searchParams.get("loading")).toBe("async");
    expect(url.searchParams.get("callback")).toBe("kaffeineMapsReady");
    expect(importLibrary).toHaveBeenCalledWith("places");
    expect(Place).toHaveBeenCalledWith({ id: "abc" });
    expect(fetchFields).toHaveBeenCalledWith({ fields: ["types"] });
  });

  it("returns no types when Google has none", async () => {
    captureScripts();
    const maps = freshModule();
    installMaps(undefined);
    const types = maps.fetchPlaceTypes("KEY", "abc");
    testWindow().kaffeineMapsReady!();
    expect(await types).toEqual([]);
  });

  it("retries the script after a failed load", async () => {
    const scripts = captureScripts();
    const maps = freshModule();
    const failed = maps.loadMaps("KEY");
    scripts[0]!.onerror!(new Event("error"));
    await expect(failed).rejects.toThrow("Couldn't load Google Maps.");
    void maps.loadMaps("KEY");
    expect(scripts).toHaveLength(2);
  });

  it("fails when the library is missing after load", async () => {
    captureScripts();
    const maps = freshModule();
    const library = maps.importPlacesLibrary("KEY");
    testWindow().kaffeineMapsReady!();
    await expect(library).rejects.toThrow(/without its library/);
  });
});
