import { googleTypeOf } from "../domain/googleTypes";
import { GoogleTypeResult } from "../domain/triage";
import { Place } from "../domain/types";

export const LOOKUPS_IN_FLIGHT = 5;
export const BATCH_SIZE = 10;

const SKIPPABLE = /NOT_FOUND|INVALID_ARGUMENT|INVALID_REQUEST/;
const QUOTA = /RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|quota/i;
const DENIED = /PERMISSION_DENIED|REQUEST_DENIED|UNAUTHENTICATED|denied/i;

export interface ClassifyOptions {
  lookup: (placeId: string) => Promise<string[]>;
  onBatch: (results: GoogleTypeResult[], done: number, total: number) => void;
  signal?: AbortSignal;
  concurrency?: number;
  batchSize?: number;
}

function errorDetail(error: unknown): string {
  const code = (error as { code?: unknown } | undefined)?.code;
  const message = error instanceof Error ? error.message : String(error);
  return typeof code === "string" ? `${code} ${message}` : message;
}

export const isSkippable = (error: unknown): boolean =>
  SKIPPABLE.test(errorDetail(error));

export function describeLookupError(error: unknown): string {
  const detail = errorDetail(error);
  if (QUOTA.test(detail))
    return "Google's quota for place lookups is used up. Try again tomorrow; progress is saved.";
  if (DENIED.test(detail))
    return "Google refused the lookup. Check that the API key allows this site and Places API (New).";
  return `Google lookup failed: ${detail}`;
}

export async function classifyPlaces(
  places: Place[],
  {
    lookup,
    onBatch,
    signal,
    concurrency = LOOKUPS_IN_FLIGHT,
    batchSize = BATCH_SIZE,
  }: ClassifyOptions,
): Promise<number> {
  const queue = [...places];
  let done = 0;
  let pending: GoogleTypeResult[] = [];
  let failure: unknown;

  const flush = () => {
    if (pending.length === 0) return;
    onBatch(pending, done, places.length);
    pending = [];
  };
  const record = (result: GoogleTypeResult) => {
    pending.push(result);
    done += 1;
    if (pending.length >= batchSize) flush();
  };
  const classifyOne = async (place: Place) => {
    try {
      const googleType = googleTypeOf(await lookup(place.googlePlaceId ?? ""));
      record({ id: place.id, ...(googleType && { googleType }) });
    } catch (error) {
      if (isSkippable(error)) record({ id: place.id });
      else failure ??= error;
    }
  };
  const shouldStop = () => failure !== undefined || signal?.aborted === true;
  const worker = async () => {
    for (let next = queue.shift(); next && !shouldStop(); next = queue.shift())
      await classifyOne(next);
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  flush();
  if (failure !== undefined)
    throw new Error(describeLookupError(failure), { cause: failure });
  return done;
}
