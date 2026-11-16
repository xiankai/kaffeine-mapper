export function scoreClass(value: number | undefined): string {
  if (value === undefined) return "score-unknown";
  if (value >= 70) return "score-high";
  if (value >= 45) return "score-mid";
  return "score-low";
}

export const SCORE_COLORS: Record<string, string> = {
  "score-high": "#2f8f5b",
  "score-mid": "#c99a2e",
  "score-low": "#c2493d",
  "score-unknown": "#8a8f98",
};
