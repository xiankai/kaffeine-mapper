import { isCheckin } from "./checkin";
import { GoogleType } from "./googleTypes";
import { Dataset, Place, Review } from "./types";

export const AUTO_CAFE_MAX_DISTANCE_M = 25;
export const AUTO_CAFE_MIN_VISIT_MIN = 45;
export const SHORT_VISIT_MAX_MIN = 30;

export interface TriageSignals {
  clearOsmMatchM?: number;
  visits: number;
  timelineVisits: number;
  longestVisitMin: number;
  onList: boolean;
  googleType?: GoogleType;
}

export type TriageVerdict = "cafe" | "not-cafe" | "short-visit" | "undecided";

export function triageSignals(place: Place): TriageSignals {
  const timeline = place.visits.filter((v) => !isCheckin(v));
  const clearMatch = place.osmCandidates?.length ? undefined : place.osm;
  return {
    ...(clearMatch && { clearOsmMatchM: clearMatch.distanceM }),
    visits: place.visits.length,
    timelineVisits: timeline.length,
    longestVisitMin: Math.max(0, ...timeline.map((v) => v.durationMin)),
    onList: place.lists.length > 0,
  };
}

function isConfidentCafe(signals: TriageSignals): boolean {
  return (
    signals.clearOsmMatchM !== undefined &&
    signals.clearOsmMatchM <= AUTO_CAFE_MAX_DISTANCE_M &&
    signals.longestVisitMin >= AUTO_CAFE_MIN_VISIT_MIN
  );
}

function isShortOneOff(signals: TriageSignals): boolean {
  return (
    signals.visits === 1 &&
    signals.timelineVisits === 1 &&
    signals.longestVisitMin < SHORT_VISIT_MAX_MIN &&
    !signals.onList
  );
}

export function triageVerdict(signals: TriageSignals): TriageVerdict {
  if (signals.googleType === "cafe") return "cafe";
  if (signals.googleType === "not-cafe") return "not-cafe";
  if (isConfidentCafe(signals)) return "cafe";
  if (isShortOneOff(signals)) return "short-visit";
  return "undecided";
}

export const isUndecided = (place: Place): boolean =>
  place.review === "pending" && place.reviewBy === undefined;

export const needsGoogleCheck = (place: Place): boolean =>
  isUndecided(place) &&
  place.googlePlaceId !== undefined &&
  place.googleCheckedAt === undefined;

export function applyGoogleType(
  place: Place,
  googleType: GoogleType | undefined,
  checkedAt: string,
): Place {
  const checked = { ...place, googleCheckedAt: checkedAt };
  if (!isUndecided(place)) return checked;
  const verdict = triageVerdict({
    ...triageSignals(place),
    ...(googleType && { googleType }),
  });
  if (verdict !== "cafe" && verdict !== "not-cafe") return checked;
  return { ...checked, review: verdict, reviewBy: "google" };
}

export interface GoogleTypeResult {
  id: string;
  googleType?: GoogleType;
}

export function applyGoogleTypes(
  dataset: Dataset,
  results: GoogleTypeResult[],
  checkedAt: string,
): Dataset {
  const byId = new Map(results.map((r) => [r.id, r]));
  return {
    ...dataset,
    places: dataset.places.map((p) => {
      const result = byId.get(p.id);
      return result ? applyGoogleType(p, result.googleType, checkedAt) : p;
    }),
  };
}

export const isShortVisitOnly = (place: Place): boolean =>
  triageVerdict(triageSignals(place)) === "short-visit";

export function autoTriage(place: Place): Place {
  if (!isUndecided(place)) return place;
  if (triageVerdict(triageSignals(place)) !== "cafe") return place;
  return { ...place, review: "cafe", reviewBy: "auto" };
}

export function triageDataset(dataset: Dataset): Dataset {
  const places = dataset.places.map(autoTriage);
  const changed = places.some((p, i) => p !== dataset.places[i]);
  return changed ? { ...dataset, places } : dataset;
}

export function decideReview(place: Place, review: Review): Place {
  return { ...place, review, reviewBy: "owner" };
}

export function decideMany(
  dataset: Dataset,
  ids: string[],
  review: Review,
): Dataset {
  const chosen = new Set(ids);
  return {
    ...dataset,
    places: dataset.places.map((p) =>
      chosen.has(p.id) ? decideReview(p, review) : p,
    ),
  };
}

export const totalMinutes = (place: Place): number =>
  place.visits.reduce((sum, v) => sum + v.durationMin, 0);

export function byVisitsThenMinutes(a: Place, b: Place): number {
  return b.visits.length - a.visits.length || totalMinutes(b) - totalMinutes(a);
}
