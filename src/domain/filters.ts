import { withinArea } from "./area";
import {
  displayName,
  isBookmarked,
  isChain,
  isLikelyCafe,
  isVisited,
  scheduleOf,
} from "./insights";
import { isOpenAt, weekendOpenShare } from "./openingHours";
import { Point } from "./osm";
import {
  Score,
  ScoreContext,
  scorePlace,
  socketScore,
  wifiScore,
} from "./scoring";
import { Place } from "./types";

export type StatusFilter = "all" | "visited" | "bookmarked" | "to-try";
export type ReviewFilter = "likely" | "pending" | "all";
export type SortKey = "score" | "visits" | "name" | "recent";

export interface Filters {
  status: StatusFilter;
  review: ReviewFilter;
  openAt?: { day: number; minute: number };
  weekend: boolean;
  sockets: boolean;
  wifi: boolean;
  independent: boolean;
  query: string;
  sort: SortKey;
  area?: Point | undefined;
}

export const DEFAULT_FILTERS: Filters = {
  status: "all",
  review: "likely",
  weekend: false,
  sockets: false,
  wifi: false,
  independent: false,
  query: "",
  sort: "score",
};

export interface RankedPlace {
  place: Place;
  score: Score;
}

function matchesStatus(place: Place, status: StatusFilter): boolean {
  if (status === "visited") return isVisited(place);
  if (status === "bookmarked") return isBookmarked(place);
  if (status === "to-try") return isBookmarked(place) && !isVisited(place);
  return true;
}

function matchesReview(place: Place, review: ReviewFilter): boolean {
  if (review === "likely") return isLikelyCafe(place);
  if (review === "pending") return place.review === "pending";
  return true;
}

function matchesHours(place: Place, filters: Filters): boolean {
  if (!filters.openAt && !filters.weekend) return true;
  const schedule = scheduleOf(place);
  if (!schedule) return false;
  if (
    filters.openAt &&
    !isOpenAt(schedule, filters.openAt.day, filters.openAt.minute)
  )
    return false;
  return !filters.weekend || weekendOpenShare(schedule) === 1;
}

function matchesAmenities(
  place: Place,
  filters: Filters,
  ctx: ScoreContext,
): boolean {
  if (filters.sockets && (socketScore(place) ?? 0) < 0.5) return false;
  if (filters.wifi && (wifiScore(place) ?? 0) < 0.5) return false;
  return !filters.independent || isChain(place, ctx.chainCounts) === false;
}

function matchesQuery(place: Place, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [displayName(place), place.address, ...place.lists].some((t) =>
    t?.toLowerCase().includes(q),
  );
}

const NEUTRAL_SCORE = 50;

export function confidentScore({ value, coverage }: Score): number {
  if (value === undefined) return -1;
  return value * coverage + NEUTRAL_SCORE * (1 - coverage);
}

const SORTERS: Record<SortKey, (a: RankedPlace, b: RankedPlace) => number> = {
  score: (a, b) => confidentScore(b.score) - confidentScore(a.score),
  visits: (a, b) => b.place.visits.length - a.place.visits.length,
  name: (a, b) => displayName(a.place).localeCompare(displayName(b.place)),
  recent: (a, b) =>
    (b.place.visits.at(-1)?.start ?? "").localeCompare(
      a.place.visits.at(-1)?.start ?? "",
    ),
};

export function rankPlaces(
  places: Place[],
  filters: Filters,
  ctx: ScoreContext,
): RankedPlace[] {
  return places
    .filter(
      (p) =>
        p.located &&
        withinArea(p, filters.area) &&
        matchesStatus(p, filters.status) &&
        matchesReview(p, filters.review) &&
        matchesHours(p, filters) &&
        matchesAmenities(p, filters, ctx) &&
        matchesQuery(p, filters.query),
    )
    .map((place) => ({ place, score: scorePlace(place, ctx) }))
    .sort(SORTERS[filters.sort]);
}
