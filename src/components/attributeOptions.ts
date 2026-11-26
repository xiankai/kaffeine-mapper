import { Slot } from "../domain/types";

export const WIFI_LIMITS = ["none", "30", "60", "120", "180"] as const;
export type WifiLimitOption = (typeof WIFI_LIMITS)[number];

export const WIFI_LIMIT_LABELS: Record<WifiLimitOption, string> = {
  none: "no limit",
  "30": "30 min",
  "60": "1 h",
  "120": "2 h",
  "180": "3 h",
};

export const RATINGS = ["1", "2", "3", "4", "5"] as const;
export type RatingOption = (typeof RATINGS)[number];

export const slotLabel = (slot: Slot) => slot.replace("-", " ");

export function limitValue(
  limit: number | null | undefined,
): WifiLimitOption | undefined {
  if (limit === undefined) return undefined;
  return (limit === null ? "none" : String(limit)) as WifiLimitOption;
}

export function parseLimit(
  value: WifiLimitOption | undefined,
): number | null | undefined {
  if (value === undefined) return undefined;
  return value === "none" ? null : Number(value);
}

export function ratingValue(rating: number | undefined) {
  return rating === undefined ? undefined : (String(rating) as RatingOption);
}

export function parseRating(value: RatingOption | undefined) {
  return value === undefined ? undefined : Number(value);
}
