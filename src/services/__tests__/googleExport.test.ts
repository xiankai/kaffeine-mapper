import { strToU8, zipSync } from "fflate";
import { AccessToken, DataPortabilityError } from "../../dataPortability";
import {
  currentToken,
  describeExportError,
  EXPORT_RESOURCES,
  finishSignIn,
  pullSavedPlaces,
  signInUrl,
  takePendingPull,
} from "../googleExport";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const token = (resources = EXPORT_RESOURCES): AccessToken => ({
  accessToken: "tok",
  expiresAt: Date.now() + 3600000,
  resources,
});

const archive = () =>
  zipSync({
    "Saved/Want to go.csv": strToU8(
      'Title,Note,URL,Tags,Comment\nKiln,,"https://www.google.com/maps/place/Kiln/@51.5,-0.1,17z",,\n',
    ),
  });

function api(routes: Record<string, () => Response>) {
  return jest.fn(async (url: string) => {
    const route = Object.keys(routes).find((r) => url.includes(r));
    if (!route) throw new Error(`unexpected ${url}`);
    return routes[route]!();
  }) as unknown as jest.Mock & typeof fetch;
}

describe("sign-in round trip", () => {
  it("stores state, then the token from the redirect", () => {
    const session = new MemoryStorage();
    const url = new URL(
      signInUrl("client", "https://example.test/app/", session, () => "s1"),
    );
    expect(url.searchParams.get("state")).toBe("s1");
    expect(url.searchParams.get("scope")).toContain("saved.collections");

    expect(finishSignIn("#/import", session)).toBeUndefined();
    const result = finishSignIn(
      "#access_token=tok&expires_in=3600&state=s1",
      session,
      1000,
    );
    expect(result?.ok).toBe(true);
    expect(currentToken(session, 2000)?.accessToken).toBe("tok");
    expect(currentToken(session, 3600000)).toBeUndefined();
    expect(takePendingPull(session)).toEqual({ pending: true });
    expect(takePendingPull(session)).toEqual({ pending: false });
  });

  it("keeps a sign-in error for the Import page", () => {
    const session = new MemoryStorage();
    signInUrl("client", "https://example.test/", session, () => "s1");
    finishSignIn("#error=access_denied&state=s1", session);
    expect(currentToken(session)).toBeUndefined();
    expect(takePendingPull(session)).toEqual({
      pending: false,
      error: "Google sign-in failed: access_denied",
    });
  });

  it("has no token before sign-in", () => {
    expect(currentToken(new MemoryStorage())).toBeUndefined();
  });

  it("uses the browser's storage and random state by default", () => {
    signInUrl("client", "https://example.test/");
    expect(takePendingPull().pending).toBe(true);
    expect(finishSignIn("#/explore")).toBeUndefined();
    expect(currentToken()).toBeUndefined();
  });
});

describe("pullSavedPlaces", () => {
  it("initiates, waits, downloads and parses the archive", async () => {
    const jobs = new MemoryStorage();
    const states = [
      json({ name: "n", state: "IN_PROGRESS" }),
      json({ name: "n", state: "COMPLETE", urls: ["https://dl.test/a.zip"] }),
    ];
    const fetchImpl = api({
      "portabilityArchive:initiate": () =>
        json({ archiveJobId: "job1", accessType: "ACCESS_TYPE_TIME_BASED" }),
      portabilityArchiveState: () => states.shift()!,
      "dl.test": () => new Response(archive()),
    });
    const onStatus = jest.fn();
    const pulled = await pullSavedPlaces(token(), {
      fetchImpl,
      jobs,
      onStatus,
      wait: async () => undefined,
    });
    expect(pulled.lists).toEqual(["Want to go"]);
    expect(pulled.places.map((p) => [p.name, p.located])).toEqual([
      ["Kiln", true],
    ]);
    expect(onStatus).toHaveBeenCalledWith(
      "Google is preparing your export (IN_PROGRESS)…",
    );
    expect(onStatus).toHaveBeenLastCalledWith("Downloading 1 archive(s)…");
    const initiate = fetchImpl.mock.calls[0] as [
      string,
      Parameters<typeof fetch>[1] & object,
    ];
    expect(JSON.parse(initiate[1].body as string)).toEqual({
      resources: EXPORT_RESOURCES,
    });
    expect(jobs.getItem("kaffeine:google-job")).toBeNull();
  });

  it("resumes a stored job instead of starting another", async () => {
    const jobs = new MemoryStorage();
    jobs.setItem("kaffeine:google-job", "job9");
    const fetchImpl = api({
      "archiveJobs/job9/portabilityArchiveState": () =>
        json({ name: "n", state: "COMPLETE", urls: [] }),
    });
    expect(await pullSavedPlaces(token(), { fetchImpl, jobs })).toEqual({
      places: [],
      lists: [],
    });
  });

  it("keeps the job across a transient failure and drops it otherwise", async () => {
    const jobs = new MemoryStorage();
    jobs.setItem("kaffeine:google-job", "job9");
    await expect(
      pullSavedPlaces(token(), {
        jobs,
        fetchImpl: api({ archiveJobs: () => json({}, 503) }),
      }),
    ).rejects.toMatchObject({ kind: "unavailable" });
    expect(jobs.getItem("kaffeine:google-job")).toBe("job9");

    await expect(
      pullSavedPlaces(token(), {
        jobs,
        fetchImpl: api({
          archiveJobs: () => json({ name: "n", state: "FAILED" }),
        }),
      }),
    ).rejects.toThrow("Export job failed.");
    expect(jobs.getItem("kaffeine:google-job")).toBeNull();
  });

  it("only asks for granted resources and refuses when none are", async () => {
    const fetchImpl = api({
      "portabilityArchive:initiate": () => json({ archiveJobId: "j" }),
      archiveJobs: () => json({ name: "n", state: "COMPLETE", urls: [] }),
    });
    await pullSavedPlaces(token(["maps.starred_places"]), {
      fetchImpl,
      jobs: new MemoryStorage(),
    });
    const [, init] = fetchImpl.mock.calls[0] as [
      string,
      Parameters<typeof fetch>[1] & object,
    ];
    expect(JSON.parse(init.body as string).resources).toEqual([
      "maps.starred_places",
    ]);
    await expect(
      pullSavedPlaces(token([]), { fetchImpl, jobs: new MemoryStorage() }),
    ).rejects.toThrow("Google didn't grant access");
  });

  it("resets a used one-time grant so the next sign-in can export again", async () => {
    const exhausted = (accessType: string) => () =>
      json(
        {
          error: {
            status: "RESOURCE_EXHAUSTED",
            details: [{ metadata: { access_type: accessType } }],
          },
        },
        429,
      );
    const oneTime = api({
      "portabilityArchive:initiate": exhausted("ACCESS_TYPE_ONE_TIME"),
      "authorization:reset": () => json({}),
    });
    await expect(
      pullSavedPlaces(token(), {
        fetchImpl: oneTime,
        jobs: new MemoryStorage(),
      }),
    ).rejects.toMatchObject({ kind: "already-exported" });
    expect(oneTime.mock.calls.map(([url]) => url)).toContainEqual(
      expect.stringContaining("authorization:reset"),
    );

    const timeBased = api({
      "portabilityArchive:initiate": exhausted("ACCESS_TYPE_TIME_BASED"),
    });
    await expect(
      pullSavedPlaces(token(), {
        fetchImpl: timeBased,
        jobs: new MemoryStorage(),
      }),
    ).rejects.toMatchObject({ kind: "already-exported" });
    expect(timeBased).toHaveBeenCalledTimes(1);
  });

  it("forgets a token Google rejected or a reset revoked, and keeps a good one", async () => {
    const stored = (session: MemoryStorage) =>
      session.setItem("kaffeine:google-token", JSON.stringify(token()));
    const rejected = new MemoryStorage();
    stored(rejected);
    await expect(
      pullSavedPlaces(token(), {
        session: rejected,
        jobs: new MemoryStorage(),
        fetchImpl: api({ "portabilityArchive:initiate": () => json({}, 401) }),
      }),
    ).rejects.toMatchObject({ kind: "unauthenticated" });
    expect(currentToken(rejected)).toBeUndefined();

    const reset = new MemoryStorage();
    stored(reset);
    await expect(
      pullSavedPlaces(token(), {
        session: reset,
        jobs: new MemoryStorage(),
        fetchImpl: api({
          "portabilityArchive:initiate": () =>
            json(
              {
                error: {
                  status: "RESOURCE_EXHAUSTED",
                  details: [
                    { metadata: { access_type: "ACCESS_TYPE_ONE_TIME" } },
                  ],
                },
              },
              429,
            ),
          "authorization:reset": () => json({}),
        }),
      }),
    ).rejects.toMatchObject({ kind: "already-exported" });
    expect(currentToken(reset)).toBeUndefined();

    const kept = new MemoryStorage();
    stored(kept);
    await expect(
      pullSavedPlaces(token(), {
        session: kept,
        jobs: new MemoryStorage(),
        fetchImpl: api({ "portabilityArchive:initiate": () => json({}, 503) }),
      }),
    ).rejects.toMatchObject({ kind: "unavailable" });
    expect(currentToken(kept)).toBeDefined();
  });

  it("defaults to the browser's fetch and localStorage", async () => {
    const original = global.fetch;
    global.fetch = api({
      "portabilityArchive:initiate": () => json({ archiveJobId: "j" }),
      archiveJobs: () => json({ name: "n", state: "COMPLETE", urls: [] }),
    });
    expect((await pullSavedPlaces(token())).places).toEqual([]);
    global.fetch = original;
  });
});

describe("describeExportError", () => {
  const dpa = (kind: string, extra: Partial<DataPortabilityError> = {}) =>
    Object.assign(new DataPortabilityError("raw", kind as never, 400), extra);

  it("explains each case in plain words", () => {
    expect(
      describeExportError(
        dpa("already-exported", { accessType: "ACCESS_TYPE_ONE_TIME" }),
      ),
    ).toBe(
      "Google allows one export per sign-in. Sign in again to pull a fresh copy.",
    );
    expect(
      describeExportError(
        dpa("already-exported", { retryAfter: "2026-11-18T00:00:00Z" }),
      ),
    ).toMatch(/^Google allows one export a day; try again after .+\.$/);
    expect(describeExportError(dpa("already-exported"))).toBe(
      "Google allows one export a day; try again tomorrow.",
    );
    expect(describeExportError(dpa("unauthenticated"))).toBe(
      "Your Google sign-in expired. Sign in again.",
    );
    expect(describeExportError(dpa("forbidden"))).toBe("raw");
    expect(describeExportError(new Error("plain"))).toBe("plain");
    expect(describeExportError("text")).toBe("text");
  });
});
