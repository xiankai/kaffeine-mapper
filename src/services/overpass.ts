import {
  buildOverpassQuery,
  CafeMatch,
  cellBBox,
  cellKey,
  matchCafe,
  OsmElement,
  refreshMatch,
} from "../domain/osm";
import { displayName } from "../domain/insights";
import { Place } from "../domain/types";

export const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
export const STALE_AFTER_DAYS = 30;
export const MATCH_RADIUS_M = 80;
export const MATCHER_VERSION = 2;
const MAX_ATTEMPTS = 6;
let lastGoodEndpoint = 0;

export interface EnrichOptions {
  fetchImpl?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  cellsPerQuery?: number;
  now?: () => Date;
  onBatch?: (enriched: Place[], done: number, total: number) => void;
  signal?: AbortSignal;
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function needsEnrichment(place: Place, now: Date): boolean {
  if (!place.located || place.review === "not-cafe") return false;
  if (!place.osmCheckedAt) return true;
  if (!place.osm && place.osmMatcher !== MATCHER_VERSION) return true;
  const ageDays = (now.getTime() - Date.parse(place.osmCheckedAt)) / 86400000;
  return ageDays > STALE_AFTER_DAYS;
}

async function fetchElements(
  cells: string[],
  fetchImpl: typeof fetch,
  wait: (ms: number) => Promise<void>,
  signal: AbortSignal | undefined,
): Promise<OsmElement[]> {
  const body = new URLSearchParams({
    data: buildOverpassQuery(cells.map(cellBBox)),
  });
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const endpoint = (lastGoodEndpoint + attempt) % OVERPASS_URLS.length;
    const url = OVERPASS_URLS[endpoint] as string;
    const response = await fetchImpl(url, {
      method: "POST",
      body,
      ...(signal && { signal }),
    }).catch((error: unknown) => {
      if (signal?.aborted) throw error;
      return undefined;
    });
    if (response?.ok) {
      lastGoodEndpoint = endpoint;
      return (
        ((await response.json()) as { elements?: OsmElement[] }).elements ?? []
      );
    }
    if (response && response.status !== 429 && response.status < 500) {
      throw new Error(`Overpass returned ${response.status}`);
    }
    await wait(Math.min(60000, 5000 * 2 ** attempt));
  }
  throw new Error(
    "Overpass is busy or unreachable; progress is saved, try again later.",
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

function byCell(places: Place[]): Map<string, Place[]> {
  const cells = new Map<string, Place[]>();
  places.forEach((p) =>
    cells.set(cellKey(p), [...(cells.get(cellKey(p)) ?? []), p]),
  );
  return cells;
}

function confirmedMatch(place: Place, elements: OsmElement[]): CafeMatch {
  if (place.review !== "cafe" || !place.osm) return {};
  return { match: refreshMatch(place, elements, place.osm.id) ?? place.osm };
}

function findMatch(place: Place, elements: OsmElement[]): CafeMatch {
  const confirmed = confirmedMatch(place, elements);
  if (confirmed.match) return confirmed;
  return matchCafe(
    place,
    elements,
    MATCH_RADIUS_M,
    place.name ? displayName(place) : undefined,
  );
}

function withMatch(
  place: Place,
  elements: OsmElement[],
  checkedAt: string,
): Place {
  const { match, candidates } = findMatch(place, elements);
  const { osm: _osm, osmCandidates: _candidates, ...rest } = place;
  return {
    ...rest,
    ...(match && { osm: match }),
    ...(candidates && { osmCandidates: candidates }),
    osmCheckedAt: checkedAt,
    osmMatcher: MATCHER_VERSION,
  };
}

export async function enrichPlaces(
  places: Place[],
  options: EnrichOptions = {},
): Promise<Place[]> {
  const {
    fetchImpl = fetch,
    wait = sleep,
    cellsPerQuery = 4,
    now = () => new Date(),
    onBatch,
    signal,
  } = options;
  const cells = byCell(places);
  const results: Place[] = [];
  for (const [index, batch] of chunk(
    [...cells.keys()],
    cellsPerQuery,
  ).entries()) {
    if (index > 0) await wait(1000);
    const elements = await fetchElements(batch, fetchImpl, wait, signal);
    const checkedAt = now().toISOString();
    const enriched = batch.flatMap((cell) =>
      (cells.get(cell) ?? []).map((p) => withMatch(p, elements, checkedAt)),
    );
    results.push(...enriched);
    onBatch?.(enriched, results.length, places.length);
  }
  return results;
}
