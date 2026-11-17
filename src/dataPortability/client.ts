export const API_ROOT = "https://dataportability.googleapis.com/v1";

export type AccessType =
  "ACCESS_TYPE_UNSPECIFIED" | "ACCESS_TYPE_ONE_TIME" | "ACCESS_TYPE_TIME_BASED";

export type JobState =
  "STATE_UNSPECIFIED" | "IN_PROGRESS" | "COMPLETE" | "FAILED" | "CANCELLED";

export interface ArchiveJob {
  archiveJobId: string;
  accessType: AccessType;
}

export interface ArchiveState {
  name: string;
  state: JobState;
  urls?: string[];
  exportTime?: string;
  startTime?: string;
}

export interface AccessTypes {
  oneTimeResources?: string[];
  timeBasedResources?: string[];
}

export interface InitiateOptions {
  startTime?: string;
  endTime?: string;
}

export type DpaErrorKind =
  | "unauthenticated"
  | "already-exported"
  | "forbidden"
  | "not-found"
  | "unavailable"
  | "other";

export class DataPortabilityError extends Error {
  constructor(
    message: string,
    readonly kind: DpaErrorKind,
    readonly status: number,
    readonly retryAfter?: string,
    readonly accessType?: string,
  ) {
    super(message);
    this.name = "DataPortabilityError";
  }
}

interface GoogleErrorBody {
  error?: {
    message?: string;
    status?: string;
    details?: { reason?: string; metadata?: Record<string, string> }[];
  };
}

function kindOf(status: number, body: GoogleErrorBody): DpaErrorKind {
  if (status === 401) return "unauthenticated";
  if (status === 429 && body.error?.status === "RESOURCE_EXHAUSTED")
    return "already-exported";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status >= 500) return "unavailable";
  return "other";
}

async function toError(response: Response): Promise<DataPortabilityError> {
  const body = (await response.json().catch(() => ({}))) as GoogleErrorBody;
  const metadata = body.error?.details?.find((d) => d.metadata)?.metadata;
  return new DataPortabilityError(
    body.error?.message ?? `Data Portability API returned ${response.status}`,
    kindOf(response.status, body),
    response.status,
    metadata?.timestamp_after_24hrs,
    metadata?.access_type,
  );
}

export interface ClientOptions {
  accessToken: () => string | Promise<string>;
  fetchImpl?: typeof fetch;
  apiRoot?: string;
}

export interface DataPortabilityClient {
  initiate(resources: string[], options?: InitiateOptions): Promise<ArchiveJob>;
  state(jobId: string): Promise<ArchiveState>;
  retry(jobId: string): Promise<string>;
  cancel(jobId: string): Promise<void>;
  checkAccessType(): Promise<AccessTypes>;
  resetAuthorization(): Promise<void>;
}

export function createClient(options: ClientOptions): DataPortabilityClient {
  const { accessToken, fetchImpl = fetch, apiRoot = API_ROOT } = options;

  async function call<T>(method: string, path: string, body?: unknown) {
    const response = await fetchImpl(`${apiRoot}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw await toError(response);
    return (await response.json().catch(() => ({}))) as T;
  }

  const job = (jobId: string) => `archiveJobs/${encodeURIComponent(jobId)}`;

  return {
    initiate: (resources, range = {}) =>
      call<ArchiveJob>("POST", "portabilityArchive:initiate", {
        resources,
        ...range,
      }),
    state: (jobId) =>
      call<ArchiveState>("GET", `${job(jobId)}/portabilityArchiveState`),
    retry: async (jobId) =>
      (await call<{ archiveJobId: string }>("POST", `${job(jobId)}:retry`, {}))
        .archiveJobId,
    cancel: async (jobId) => {
      await call("POST", `${job(jobId)}:cancel`, {});
    },
    checkAccessType: () => call<AccessTypes>("POST", "accessType:check", {}),
    resetAuthorization: async () => {
      await call("POST", "authorization:reset", {});
    },
  };
}
