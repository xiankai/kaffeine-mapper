import { distanceM, Point } from "./osm";
import { Place } from "./types";

export type AreaMode = "recent" | "near" | "everywhere";

export const AREA_MODES: readonly AreaMode[] = ["recent", "near", "everywhere"];
export const AREA_RADIUS_M = 30_000;
const RECENT_VISIT_COUNT = 10;

function neighbourCount(place: Place, pool: Place[]): number {
  return pool.filter((other) => distanceM(place, other) <= AREA_RADIUS_M)
    .length;
}

function densest(pool: Place[]): Place | undefined {
  let best: Place | undefined;
  let bestCount = 0;
  for (const place of pool) {
    const count = neighbourCount(place, pool);
    if (count > bestCount) [best, bestCount] = [place, count];
  }
  return best;
}

function recentlyVisited(places: Place[]): Place[] {
  return places
    .flatMap((place) => place.visits.map((v) => ({ start: v.start, place })))
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, RECENT_VISIT_COUNT)
    .map((v) => v.place);
}

export function recentAnchor(places: Place[]): Point | undefined {
  const located = places.filter((p) => p.located);
  const recent = recentlyVisited(located);
  const anchor = densest(recent.length ? recent : located);
  return anchor && { lat: anchor.lat, lng: anchor.lng };
}

export function withinArea(place: Place, center: Point | undefined): boolean {
  return !center || distanceM(place, center) <= AREA_RADIUS_M;
}

export function isAreaMode(value: unknown): value is AreaMode {
  return AREA_MODES.includes(value as AreaMode);
}
