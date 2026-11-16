import {
  buildOverpassQuery,
  cellBBox,
  cellKey,
  matchNearest,
  OsmElement,
} from "../domain/osm";
import { displayName } from "../domain/insights";
import { Place } from "../domain/types";

export const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
export const STALE_AFTER_DAYS = 30;
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
  const ageDays = (now.getTime() - Date.parse(place.osmCheckedAt)) / 86400000;
  return ageDays > STALE_AFTER_DAYS;
}

export function radiusFor(place: Place): number {
  return place.sources.includes("timeline") ? 40 : 80;
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

function withMatch(
  place: Place,
  elements: OsmElement[],
  checkedAt: string,
): Place {
  const radius = radiusFor(place);
  const match = matchNearest(
    place,
    elements,
    radius,
    place.name ? displayName(place) : undefined,
  );
  const { osm: _previous, ...rest } = place;
  return { ...rest, ...(match && { osm: match }), osmCheckedAt: checkedAt };
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
