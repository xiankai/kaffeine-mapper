export type PlaceSource = "timeline" | "saved" | "starred" | "manual";

export type Review = "pending" | "cafe" | "not-cafe";
export type ReviewBy = "auto" | "google" | "owner";

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

export const SOCKET_LEVELS: readonly SocketLevel[] = ["none", "few", "many"];
export const WIFI_LEVELS: readonly WifiLevel[] = [
  "none",
  "weak",
  "ok",
  "strong",
];
export const SEAT_LEVELS: readonly SeatLevel[] = ["easy", "ok", "hard"];

export interface Visit {
  start: string;
  localDay: number;
  localMinute: number;
  durationMin: number;
  source?: "checkin";
}

export interface Evaluation {
  at: string;
  sockets?: SocketLevel;
  wifi?: WifiLevel;
  wifiLimitMinutes?: number | null;
  seats?: Partial<Record<Slot, SeatLevel>>;
  rating?: number;
  note?: string;
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
  osmCandidates?: OsmMatch[];
  osmCheckedAt?: string;
  osmMatcher?: number;
  review: Review;
  reviewBy?: ReviewBy;
  manual: ManualAttributes;
  evaluations?: Evaluation[];
  googleRating?: number;
  googleNote?: string;
  googleCheckedAt?: string;
}

export interface Assessed {
  manual: ManualAttributes;
  evaluations?: Evaluation[];
}

export type ChainDefaults = Assessed;

export interface Dataset {
  version: 1;
  places: Place[];
  chains?: Record<string, ChainDefaults>;
}

export const emptyDataset = (): Dataset => ({ version: 1, places: [] });
