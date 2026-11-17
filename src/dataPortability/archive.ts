import {
  ArchiveState,
  DataPortabilityClient,
  DataPortabilityError,
} from "./client";

export interface WaitOptions {
  pollMs?: number;
  maxPollMs?: number;
  wait?: (ms: number) => Promise<void>;
  onState?: (state: ArchiveState) => void;
  signal?: AbortSignal;
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted)
    throw new DataPortabilityError("Stopped waiting.", "other", 0);
}

export async function waitForArchive(
  client: DataPortabilityClient,
  jobId: string,
  options: WaitOptions = {},
): Promise<string[]> {
  const {
    pollMs = 5000,
    maxPollMs = 60000,
    wait = sleep,
    onState,
    signal,
  } = options;
  for (let delay = pollMs; ; delay = Math.min(maxPollMs, delay * 2)) {
    throwIfAborted(signal);
    const state = await client.state(jobId);
    onState?.(state);
    if (state.state === "COMPLETE") return state.urls ?? [];
    if (state.state === "FAILED" || state.state === "CANCELLED")
      throw new DataPortabilityError(
        `Export job ${state.state.toLowerCase()}.`,
        "other",
        0,
      );
    await wait(delay);
  }
}

export class DownloadBlockedError extends Error {
  constructor(readonly urls: string[]) {
    super(
      "The browser couldn't download the export (likely blocked by CORS). Open the links to save the archives, then import them as files.",
    );
    this.name = "DownloadBlockedError";
  }
}

export async function downloadArchives(
  urls: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array[]> {
  const archives: Uint8Array[] = [];
  for (const url of urls) {
    const response = await fetchImpl(url).catch(() => undefined);
    if (!response) throw new DownloadBlockedError(urls);
    if (!response.ok)
      throw new DataPortabilityError(
        `Archive download returned ${response.status}`,
        "other",
        response.status,
      );
    archives.push(new Uint8Array(await response.arrayBuffer()));
  }
  return archives;
}
