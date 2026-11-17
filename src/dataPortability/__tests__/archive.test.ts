import {
  downloadArchives,
  DownloadBlockedError,
  sleep,
  waitForArchive,
} from "../archive";
import { ArchiveState, DataPortabilityClient } from "../client";

function fakeClient(states: ArchiveState["state"][]): DataPortabilityClient {
  const queue = [...states];
  return {
    state: jest.fn(async () => {
      const state = queue.shift() ?? "IN_PROGRESS";
      return {
        name: "n",
        state,
        ...(state === "COMPLETE" && { urls: ["https://dl.test/a.zip"] }),
      };
    }),
  } as unknown as DataPortabilityClient;
}

describe("waitForArchive", () => {
  it("polls with a growing, capped delay until the archive is ready", async () => {
    const wait = jest.fn(async () => undefined);
    const onState = jest.fn();
    const urls = await waitForArchive(
      fakeClient(["IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "COMPLETE"]),
      "job",
      { pollMs: 10, maxPollMs: 25, wait, onState },
    );
    expect(urls).toEqual(["https://dl.test/a.zip"]);
    expect(wait.mock.calls.map(([ms]) => ms)).toEqual([10, 20, 25]);
    expect(onState).toHaveBeenCalledTimes(4);
  });

  it("returns no urls when a complete job lists none", async () => {
    const client = {
      state: async () => ({ name: "n", state: "COMPLETE" }),
    } as unknown as DataPortabilityClient;
    expect(await waitForArchive(client, "job")).toEqual([]);
  });

  it("fails on a failed or cancelled job", async () => {
    await expect(waitForArchive(fakeClient(["FAILED"]), "j")).rejects.toThrow(
      "Export job failed.",
    );
    await expect(
      waitForArchive(fakeClient(["CANCELLED"]), "j"),
    ).rejects.toThrow("Export job cancelled.");
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    const wait = jest.fn(async () => controller.abort());
    await expect(
      waitForArchive(fakeClient([]), "j", { wait, signal: controller.signal }),
    ).rejects.toThrow("Stopped waiting.");
  });

  it("sleeps for real by default", async () => {
    const started = Date.now();
    await sleep(5);
    expect(Date.now() - started).toBeGreaterThanOrEqual(4);
  });
});

describe("downloadArchives", () => {
  it("downloads each archive as bytes", async () => {
    const fetchImpl = jest.fn(
      async () => new Response(new Uint8Array([1, 2, 3])),
    ) as unknown as typeof fetch;
    expect(await downloadArchives(["a", "b"], fetchImpl)).toEqual([
      new Uint8Array([1, 2, 3]),
      new Uint8Array([1, 2, 3]),
    ]);
  });

  it("reports a network-level failure as a blocked download", async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const error = await downloadArchives(
      ["https://dl.test/a"],
      fetchImpl,
    ).catch((e) => e);
    expect(error).toBeInstanceOf(DownloadBlockedError);
    expect(error.urls).toEqual(["https://dl.test/a"]);
  });

  it("reports an HTTP error status", async () => {
    const fetchImpl = jest.fn(
      async () => new Response("", { status: 403 }),
    ) as unknown as typeof fetch;
    await expect(downloadArchives(["a"], fetchImpl)).rejects.toThrow(
      "Archive download returned 403",
    );
  });

  it("defaults to the global fetch", async () => {
    const original = global.fetch;
    global.fetch = jest.fn(
      async () => new Response(new Uint8Array([9])),
    ) as unknown as typeof fetch;
    expect(await downloadArchives(["a"])).toEqual([new Uint8Array([9])]);
    global.fetch = original;
  });
});
