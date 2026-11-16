export type PlaceSource = "timeline" | "saved" | "starred" | "manual";

export type Review = "pending" | "cafe" | "not-cafe";

export type DayPart = "morning" | "afternoon" | "evening";
export type DayKind = "weekday" | "weekend";
export type Slot = `${DayKind}-${DayPart}`;

export const SLOTS: readonly Slot[] = [
  "weekday-morning",
  "weekday-afternoon",
  "weekday-evening",
  "weekend-morning",
  "weekend-afternoon",
  "weekend-evening",
];

export type SocketLevel = "none" | "few" | "many";
export type WifiLevel = "none" | "weak" | "ok" | "strong";
export type SeatLevel = "easy" | "ok" | "hard";

export interface Visit {
  start: string;
  localDay: number;
  localMinute: number;
  durationMin: number;
}

export interface OsmMatch {
  id: string;
  name?: string;
  distanceM: number;
  tags: Record<string, string>;
}

export interface ManualAttributes {
  sockets?: SocketLevel;
  wifi?: WifiLevel;
  wifiLimitMinutes?: number | null;
  seats?: Partial<Record<Slot, SeatLevel>>;
  rating?: number;
  chain?: boolean;
  notes?: string;
}

export interface Place {
  id: string;
  aliases?: string[];
  googlePlaceId?: string;
  name?: string;
  address?: string;
  lat: number;
  lng: number;
  located: boolean;
  sources: PlaceSource[];
  lists: string[];
  url?: string;
  visits: Visit[];
  osm?: OsmMatch;
  osmCheckedAt?: string;
  review: Review;
  manual: ManualAttributes;
  googleRating?: number;
  googleNote?: string;
}

export interface Dataset {
  version: 1;
  places: Place[];
}

export const emptyDataset = (): Dataset => ({ version: 1, places: [] });
