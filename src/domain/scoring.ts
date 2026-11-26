import { Chains, withChainDefaults } from "./chains";
import { isChain, scheduleOf, slotOf } from "./insights";
import { openShareInSlot, weekendOpenShare } from "./openingHours";
import { Place, SeatLevel, Slot, SocketLevel, WifiLevel } from "./types";

export const METRICS = [
  "sockets",
  "wifi",
  "hours",
  "weekend",
  "seats",
  "independent",
  "habit",
  "familiarity",
  "rating",
] as const;
export type Metric = (typeof METRICS)[number];

export const METRIC_LABELS: Record<Metric, string> = {
  sockets: "Power sockets",
  wifi: "Wi-Fi (strength, limit, fee)",
  hours: "Open in my time slots",
  weekend: "Open on weekends",
  seats: "Seats free in my slots",
  independent: "Chain or independent",
  habit: "I go there in my slots",
  familiarity: "How often I've been",
  rating: "Rating",
};

export type ChainPreference = "avoid" | "neutral" | "prefer";

export interface Preferences {
  weights: Record<Metric, number>;
  slots: Slot[];
  chain: ChainPreference;
}

export const DEFAULT_PREFERENCES: Preferences = {
  weights: {
    sockets: 3,
    wifi: 3,
    hours: 3,
    weekend: 2,
    seats: 2,
    independent: 1,
    habit: 1,
    familiarity: 1,
    rating: 2,
  },
  slots: [
    "weekday-afternoon",
    "weekday-evening",
    "weekend-morning",
    "weekend-afternoon",
  ],
  chain: "avoid",
};

export interface ScoreContext {
  preferences: Preferences;
  chainCounts: Map<string, number>;
  chains?: Chains;
}

export function effectivePlace(place: Place, ctx: ScoreContext): Place {
  return withChainDefaults(place, ctx.chainCounts, ctx.chains);
}

export type MetricValues = Partial<Record<Metric, number>>;

export interface Score {
  value?: number;
  coverage: number;
  metrics: MetricValues;
}

const SOCKETS: Record<SocketLevel, number> = { none: 0, few: 0.5, many: 1 };
const WIFI: Record<WifiLevel, number> = {
  none: 0,
  weak: 0.35,
  ok: 0.7,
  strong: 1,
};
const SEATS: Record<SeatLevel, number> = { easy: 1, ok: 0.5, hard: 0 };
const WIFI_TAGS = ["wlan", "yes", "wifi"];

function average(values: number[]): number | undefined {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : undefined;
}

export function socketScore(place: Place): number | undefined {
  if (place.manual.sockets) return SOCKETS[place.manual.sockets];
  const tag = place.osm?.tags.power_supply;
  if (tag === "yes") return 0.8;
  if (tag === "no") return 0;
  return undefined;
}

function wifiLimitFactor(limit: number | null | undefined): number {
  if (limit === undefined || limit === null) return 1;
  return Math.max(0.3, Math.min(1, limit / 180));
}

export function wifiScore(place: Place): number | undefined {
  const tags = place.osm?.tags ?? {};
  const feeFactor = tags["internet_access:fee"] === "yes" ? 0.5 : 1;
  const limitFactor = wifiLimitFactor(place.manual.wifiLimitMinutes);
  if (place.manual.wifi)
    return WIFI[place.manual.wifi] * limitFactor * feeFactor;
  const access = tags.internet_access;
  if (access === "no") return 0;
  if (access && WIFI_TAGS.includes(access))
    return 0.7 * limitFactor * feeFactor;
  return place.manual.wifiLimitMinutes !== undefined
    ? 0.7 * limitFactor
    : undefined;
}

function weekendScore(place: Place): number | undefined {
  const schedule = scheduleOf(place);
  if (schedule) return weekendOpenShare(schedule);
  return place.visits.some((v) => v.localDay === 0 || v.localDay === 6)
    ? 1
    : undefined;
}

function hoursScore(place: Place, slots: Slot[]): number | undefined {
  const schedule = scheduleOf(place);
  return schedule
    ? average(slots.map((s) => openShareInSlot(schedule, s)))
    : undefined;
}

function seatScore(place: Place, slots: Slot[]): number | undefined {
  const seats = place.manual.seats ?? {};
  return average(
    slots.flatMap((s) => (seats[s] ? [SEATS[seats[s] as SeatLevel]] : [])),
  );
}

function habitScore(place: Place, slots: Slot[]): number | undefined {
  if (place.visits.length === 0) return undefined;
  const inSlot = place.visits.filter((v) => {
    const slot = slotOf(v.localDay, v.localMinute);
    return slot !== undefined && slots.includes(slot);
  }).length;
  return inSlot / place.visits.length;
}

function familiarityScore(place: Place): number | undefined {
  if (place.visits.length === 0) return undefined;
  return Math.min(1, Math.log2(1 + place.visits.length) / Math.log2(21));
}

function ratingScore(place: Place): number | undefined {
  const rating = place.manual.rating ?? place.googleRating;
  return rating === undefined ? undefined : (rating - 1) / 4;
}

function independentScore(place: Place, ctx: ScoreContext): number | undefined {
  if (ctx.preferences.chain === "neutral") return undefined;
  const chain = isChain(place, ctx.chainCounts);
  if (chain === undefined) return undefined;
  return chain === (ctx.preferences.chain === "prefer") ? 1 : 0;
}

export function metricValues(place: Place, ctx: ScoreContext): MetricValues {
  const { slots } = ctx.preferences;
  const values: Record<Metric, number | undefined> = {
    sockets: socketScore(place),
    wifi: wifiScore(place),
    hours: hoursScore(place, slots),
    weekend: weekendScore(place),
    seats: seatScore(place, slots),
    independent: independentScore(place, ctx),
    habit: habitScore(place, slots),
    familiarity: familiarityScore(place),
    rating: ratingScore(place),
  };
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== undefined),
  ) as MetricValues;
}

export function scorePlace(place: Place, ctx: ScoreContext): Score {
  const metrics = metricValues(effectivePlace(place, ctx), ctx);
  const { weights } = ctx.preferences;
  const totalWeight = METRICS.reduce(
    (sum, m) => sum + Math.max(0, weights[m]),
    0,
  );
  let known = 0;
  let weighted = 0;
  for (const metric of METRICS) {
    const value = metrics[metric];
    const weight = Math.max(0, weights[metric]);
    if (value === undefined || weight === 0) continue;
    known += weight;
    weighted += value * weight;
  }
  return {
    ...(known > 0 && { value: Math.round((weighted / known) * 100) }),
    coverage: totalWeight ? known / totalWeight : 0,
    metrics,
  };
}
