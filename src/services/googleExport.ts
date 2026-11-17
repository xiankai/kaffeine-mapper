import {
  AccessToken,
  authUrl,
  createClient,
  DataPortabilityClient,
  DataPortabilityError,
  downloadArchives,
  isAuthResponse,
  readAuthResponse,
  TokenResult,
  waitForArchive,
} from "../dataPortability";
import { parseTakeoutZip } from "../domain/takeoutZip";
import { Place } from "../domain/types";

export const EXPORT_RESOURCES = ["saved.collections", "maps.starred_places"];

const STATE_KEY = "kaffeine:google-state";
const TOKEN_KEY = "kaffeine:google-token";
const PENDING_KEY = "kaffeine:google-pending";
const ERROR_KEY = "kaffeine:google-error";
const JOB_KEY = "kaffeine:google-job";
const TOKEN_MARGIN_MS = 60000;

type KeyValue = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function signInUrl(
  clientId: string,
  redirectUri: string,
  session: KeyValue = sessionStorage,
  newState: () => string = () => crypto.randomUUID(),
): string {
  const state = newState();
  session.setItem(STATE_KEY, state);
  session.setItem(PENDING_KEY, "1");
  return authUrl({ clientId, redirectUri, resources: EXPORT_RESOURCES, state });
}

export function finishSignIn(
  hash: string,
  session: KeyValue = sessionStorage,
  now = Date.now(),
): TokenResult | undefined {
  if (!isAuthResponse(hash)) return undefined;
  const result = readAuthResponse(
    hash,
    session.getItem(STATE_KEY) ?? undefined,
    now,
  );
  session.removeItem(STATE_KEY);
  if (result.ok) session.setItem(TOKEN_KEY, JSON.stringify(result.token));
  else {
    session.removeItem(PENDING_KEY);
    session.setItem(ERROR_KEY, result.error);
  }
  return result;
}

export function currentToken(
  session: KeyValue = sessionStorage,
  now = Date.now(),
): AccessToken | undefined {
  const raw = session.getItem(TOKEN_KEY);
  if (!raw) return undefined;
  const token = JSON.parse(raw) as AccessToken;
  return token.expiresAt - TOKEN_MARGIN_MS > now ? token : undefined;
}

export function takePendingPull(session: KeyValue = sessionStorage) {
  const pending = session.getItem(PENDING_KEY) === "1";
  const error = session.getItem(ERROR_KEY) ?? undefined;
  session.removeItem(PENDING_KEY);
  session.removeItem(ERROR_KEY);
  return { pending, ...(error && { error }) };
}

export interface PullOptions {
  fetchImpl?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  jobs?: KeyValue;
  session?: KeyValue;
  onStatus?: (text: string) => void;
}

export interface PulledPlaces {
  places: Place[];
  lists: string[];
}

async function startJob(
  client: DataPortabilityClient,
  resources: string[],
): Promise<string> {
  try {
    return (await client.initiate(resources)).archiveJobId;
  } catch (error) {
    if (
      error instanceof DataPortabilityError &&
      error.kind === "already-exported" &&
      error.accessType === "ACCESS_TYPE_ONE_TIME"
    )
      await client.resetAuthorization().catch(() => undefined);
    throw error;
  }
}

function grantedResources(token: AccessToken): string[] {
  const resources = EXPORT_RESOURCES.filter((r) => token.resources.includes(r));
  if (resources.length === 0)
    throw new Error(
      "Google didn't grant access to saved lists or starred places.",
    );
  return resources;
}

function parseArchives(archives: Uint8Array[]): PulledPlaces {
  const contents = archives.map(parseTakeoutZip);
  return {
    places: contents.flatMap((c) => c.places),
    lists: contents.flatMap((c) => c.lists),
  };
}

function tokenSpent(error: unknown): boolean {
  return (
    error instanceof DataPortabilityError &&
    (error.kind === "unauthenticated" ||
      (error.kind === "already-exported" &&
        error.accessType === "ACCESS_TYPE_ONE_TIME"))
  );
}

export async function pullSavedPlaces(
  token: AccessToken,
  options: PullOptions = {},
): Promise<PulledPlaces> {
  const { session = sessionStorage, ...rest } = options;
  try {
    return await pullWithToken(token, rest);
  } catch (error) {
    if (tokenSpent(error)) session.removeItem(TOKEN_KEY);
    throw error;
  }
}

async function pullWithToken(
  token: AccessToken,
  options: Omit<PullOptions, "session">,
): Promise<PulledPlaces> {
  const { fetchImpl = fetch, wait, jobs = localStorage, onStatus } = options;
  const client = createClient({
    accessToken: () => token.accessToken,
    fetchImpl,
  });
  const resources = grantedResources(token);
  const jobId = jobs.getItem(JOB_KEY) ?? (await startJob(client, resources));
  jobs.setItem(JOB_KEY, jobId);
  const urls = await waitForArchive(client, jobId, {
    ...(wait && { wait }),
    onState: (state) =>
      onStatus?.(`Google is preparing your export (${state.state})…`),
  }).catch((error: unknown) => {
    if (!isTransient(error)) jobs.removeItem(JOB_KEY);
    throw error;
  });
  jobs.removeItem(JOB_KEY);
  onStatus?.(`Downloading ${urls.length} archive(s)…`);
  return parseArchives(await downloadArchives(urls, fetchImpl));
}

function isTransient(error: unknown): boolean {
  return (
    error instanceof DataPortabilityError &&
    (error.kind === "unavailable" || error.kind === "unauthenticated")
  );
}

export function describeExportError(error: unknown): string {
  if (!(error instanceof DataPortabilityError))
    return error instanceof Error ? error.message : String(error);
  if (
    error.kind === "already-exported" &&
    error.accessType === "ACCESS_TYPE_ONE_TIME"
  )
    return "Google allows one export per sign-in. Sign in again to pull a fresh copy.";
  if (error.kind === "already-exported" && error.retryAfter)
    return `Google allows one export a day; try again after ${new Date(error.retryAfter).toLocaleString()}.`;
  if (error.kind === "already-exported")
    return "Google allows one export a day; try again tomorrow.";
  if (error.kind === "unauthenticated")
    return "Your Google sign-in expired. Sign in again.";
  return error.message;
}
