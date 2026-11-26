import { distanceM, Point } from "./osm";
import { Place, Visit } from "./types";

export const CHECKIN_RADIUS_M = 150;
export const CHECKIN_SUGGESTIONS = 5;
const OVERLAP_MS = 2 * 60 * 60 * 1000;

export const isCheckin = (visit: Visit): boolean => visit.source === "checkin";

const byStart = (a: Visit, b: Visit) => a.start.localeCompare(b.start);

export function checkinVisit(now: Date): Visit {
  return {
    start: now.toISOString(),
    localDay: now.getDay(),
    localMinute: now.getHours() * 60 + now.getMinutes(),
    durationMin: 0,
    source: "checkin",
  };
}

export interface Nearby {
  place: Place;
  distance: number;
}

export function nearbyPlaces(places: Place[], here: Point): Nearby[] {
  return places
    .filter((p) => p.located && p.review !== "not-cafe")
    .map((place) => ({ place, distance: distanceM(here, place) }))
    .filter((n) => n.distance <= CHECKIN_RADIUS_M)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, CHECKIN_SUGGESTIONS);
}

export function overlaps(checkin: Visit, visit: Visit): boolean {
  const at = Date.parse(checkin.start);
  const start = Date.parse(visit.start);
  const end = start + visit.durationMin * 60000;
  return at >= start - OVERLAP_MS && at <= end + OVERLAP_MS;
}

export function dropCoveredCheckins(visits: Visit[]): Visit[] {
  const timeline = visits.filter((v) => !isCheckin(v));
  return visits.filter(
    (v) => !isCheckin(v) || !timeline.some((t) => overlaps(v, t)),
  );
}

export function logCheckin(place: Place, visit: Visit): Place {
  if (place.visits.some((v) => overlaps(visit, v))) return place;
  return { ...place, visits: [...place.visits, visit].sort(byStart) };
}

export interface Freshness {
  timelineUpTo?: string;
  checkinsSince: number;
}

function latestTimelineStart(visits: Visit[]): string | undefined {
  return visits
    .filter((v) => !isCheckin(v))
    .map((v) => v.start)
    .sort()
    .at(-1);
}

export function freshness(places: Place[]): Freshness {
  const visits = places.flatMap((p) => p.visits);
  const latest = latestTimelineStart(visits);
  const checkinsSince = visits.filter(
    (v) => isCheckin(v) && (latest === undefined || v.start > latest),
  ).length;
  return { ...(latest && { timelineUpTo: latest }), checkinsSince };
}
