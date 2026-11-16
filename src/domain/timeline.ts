import { Place, Visit } from "./types";

export interface TimelineCriteria {
  minMinutes: number;
  maxMinutes: number;
  semanticTypes: readonly string[];
}

export const DEFAULT_CRITERIA: TimelineCriteria = {
  minMinutes: 20,
  maxMinutes: 360,
  semanticTypes: ["UNKNOWN"],
};

export interface TimelineResult {
  places: Place[];
  segmentCount: number;
  visitCount: number;
}

interface RawCandidate {
  placeId?: unknown;
  placeID?: unknown;
  semanticType?: unknown;
  placeLocation?: unknown;
}

interface RawSegment {
  startTime?: unknown;
  endTime?: unknown;
  startTimeTimezoneUtcOffsetMinutes?: unknown;
  visit?: { topCandidate?: RawCandidate };
}

interface ParsedVisit {
  placeId: string;
  semanticType: string;
  lat: number;
  lng: number;
  visit: Visit;
}

export function parseLatLng(
  value: unknown,
): { lat: number; lng: number } | undefined {
  const text =
    typeof value === "string"
      ? value
      : typeof value === "object" && value !== null && "latLng" in value
        ? String((value as { latLng: unknown }).latLng)
        : "";
  const numbers = text.replace(/^geo:/, "").match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return undefined;
  const lat = Number(numbers[0]);
  const lng = Number(numbers[1]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

function isoOffsetMinutes(iso: string): number {
  const match = iso.match(/([+-])(\d{2}):?(\d{2})$/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

export function toLocalVisit(
  start: string,
  end: string,
  offsetMinutes?: number,
): Visit | undefined {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs)
    return undefined;
  const offset = offsetMinutes ?? isoOffsetMinutes(start);
  const local = new Date(startMs + offset * 60000);
  return {
    start: new Date(startMs).toISOString(),
    localDay: local.getUTCDay(),
    localMinute: local.getUTCHours() * 60 + local.getUTCMinutes(),
    durationMin: Math.round((endMs - startMs) / 60000),
  };
}

function segmentsOf(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (typeof json === "object" && json !== null && "semanticSegments" in json) {
    const segments = (json as { semanticSegments: unknown }).semanticSegments;
    if (Array.isArray(segments)) return segments;
  }
  throw new Error(
    "Unrecognised Timeline export: expected semanticSegments or a list of segments.",
  );
}

function parseSegment(raw: unknown): ParsedVisit | undefined {
  const segment = raw as RawSegment;
  const candidate = segment?.visit?.topCandidate;
  if (
    !candidate ||
    typeof segment.startTime !== "string" ||
    typeof segment.endTime !== "string"
  ) {
    return undefined;
  }
  const placeId = candidate.placeId ?? candidate.placeID;
  const coords = parseLatLng(candidate.placeLocation);
  if (typeof placeId !== "string" || !coords) return undefined;
  const offset =
    typeof segment.startTimeTimezoneUtcOffsetMinutes === "number"
      ? segment.startTimeTimezoneUtcOffsetMinutes
      : undefined;
  const visit = toLocalVisit(segment.startTime, segment.endTime, offset);
  if (!visit) return undefined;
  const semanticType =
    typeof candidate.semanticType === "string"
      ? candidate.semanticType
      : "UNKNOWN";
  return { placeId, semanticType, ...coords, visit };
}

function qualifies(visits: ParsedVisit[], criteria: TimelineCriteria): boolean {
  return visits.some(
    (v) =>
      criteria.semanticTypes.includes(v.semanticType) &&
      v.visit.durationMin >= criteria.minMinutes &&
      v.visit.durationMin <= criteria.maxMinutes,
  );
}

function toPlace(placeId: string, visits: ParsedVisit[]): Place {
  const first = visits[0] as ParsedVisit;
  return {
    id: `g:${placeId}`,
    googlePlaceId: placeId,
    lat: first.lat,
    lng: first.lng,
    located: true,
    sources: ["timeline"],
    lists: [],
    visits: visits
      .map((v) => v.visit)
      .sort((a, b) => a.start.localeCompare(b.start)),
    review: "pending",
    manual: {},
  };
}

export function parseTimeline(
  json: unknown,
  criteria: TimelineCriteria = DEFAULT_CRITERIA,
): TimelineResult {
  const segments = segmentsOf(json);
  const byPlace = new Map<string, ParsedVisit[]>();
  let visitCount = 0;
  for (const raw of segments) {
    const parsed = parseSegment(raw);
    if (!parsed) continue;
    visitCount++;
    const list = byPlace.get(parsed.placeId) ?? [];
    list.push(parsed);
    byPlace.set(parsed.placeId, list);
  }
  const places = [...byPlace]
    .filter(([, visits]) => qualifies(visits, criteria))
    .map(([placeId, visits]) => toPlace(placeId, visits));
  return { places, segmentCount: segments.length, visitCount };
}
