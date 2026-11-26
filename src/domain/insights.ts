import { normaliseName } from "./osm";
import { parseOpeningHours, WeekSchedule } from "./openingHours";
import { DayPart, Place, Slot } from "./types";

function candidateNames(place: Place): string | undefined {
  const names = (place.osmCandidates ?? []).flatMap((c) => c.name ?? []);
  return names.length ? `${names.join(" or ")}?` : undefined;
}

export function displayName(place: Place): string {
  return (
    place.name ?? place.osm?.name ?? candidateNames(place) ?? "Unnamed place"
  );
}

export function findPlace(places: Place[], id: string): Place | undefined {
  return places.find((p) => p.id === id || p.aliases?.includes(id));
}

export function scheduleOf(place: Place): WeekSchedule | undefined {
  return parseOpeningHours(place.osm?.tags.opening_hours);
}

export function chainNameCounts(places: Place[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const place of places) {
    const name = place.osm?.tags.brand ?? place.osm?.name ?? place.name;
    if (!name) continue;
    const key = normaliseName(name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function isChain(
  place: Place,
  counts: Map<string, number>,
): boolean | undefined {
  if (place.manual.chain !== undefined) return place.manual.chain;
  const tags = place.osm?.tags ?? {};
  if (tags.brand || tags["brand:wikidata"]) return true;
  const name = place.osm?.name ?? place.name;
  if (!name) return undefined;
  if ((counts.get(normaliseName(name)) ?? 0) >= 3) return true;
  return place.osm ? false : undefined;
}

export function partOfDay(minute: number): DayPart | undefined {
  if (minute >= 6 * 60 && minute < 12 * 60) return "morning";
  if (minute >= 12 * 60 && minute < 18 * 60) return "afternoon";
  if (minute >= 18 * 60 && minute < 23 * 60) return "evening";
  return undefined;
}

export function slotOf(day: number, minute: number): Slot | undefined {
  const part = partOfDay(minute);
  if (!part) return undefined;
  return `${day === 0 || day === 6 ? "weekend" : "weekday"}-${part}`;
}

export interface VisitPattern {
  total: number;
  weekendShare: number;
  medianMinutes?: number;
  lastVisit?: string;
  heatmap: number[][];
  slots: Partial<Record<Slot, number>>;
}

export function visitPattern(place: Place): VisitPattern {
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const slots: Partial<Record<Slot, number>> = {};
  for (const v of place.visits) {
    (heatmap[v.localDay] as number[])[Math.floor(v.localMinute / 60)]! += 1;
    const slot = slotOf(v.localDay, v.localMinute);
    if (slot) slots[slot] = (slots[slot] ?? 0) + 1;
  }
  const durations = place.visits
    .filter((v) => v.source !== "checkin")
    .map((v) => v.durationMin)
    .sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];
  const weekend = place.visits.filter(
    (v) => v.localDay === 0 || v.localDay === 6,
  ).length;
  const last = place.visits.at(-1)?.start;
  return {
    total: place.visits.length,
    weekendShare: place.visits.length ? weekend / place.visits.length : 0,
    ...(median !== undefined && { medianMinutes: median }),
    ...(last && { lastVisit: last }),
    heatmap,
    slots,
  };
}

export function isVisited(place: Place): boolean {
  return place.visits.length > 0;
}

export function isBookmarked(place: Place): boolean {
  return place.lists.length > 0;
}

export function isLikelyCafe(place: Place): boolean {
  if (place.review !== "pending") return place.review === "cafe";
  return place.osm !== undefined || (place.osmCandidates?.length ?? 0) > 0;
}
