import { chainKey } from "./chains";
import { chainName } from "./insights";
import { Place } from "./types";

const QID = /^Q\d+$/;

function mostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort(
    ([a, x], [b, y]) => y - x || a.localeCompare(b),
  )[0]?.[0];
}

export function chainWikidata(
  places: Place[],
  counts: Map<string, number>,
): Map<string, string> {
  const seen = new Map<string, string[]>();
  for (const place of places) {
    const qid = place.osm?.tags["brand:wikidata"];
    const key = chainKey(place, counts);
    if (!key || !qid || !QID.test(qid)) continue;
    seen.set(key, [...(seen.get(key) ?? []), qid]);
  }
  return new Map(
    [...seen.entries()].map(([key, qids]) => [key, mostCommon(qids) as string]),
  );
}

export function initialsOf(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1
      ? words.slice(0, 2).map((w) => [...w][0] ?? "")
      : [...(words[0] ?? "")].slice(0, 2);
  return letters.join("").toUpperCase() || "?";
}

interface MarkerBase {
  ring: string;
  visited: boolean;
}

export type MarkerSpec = MarkerBase &
  (
    | { kind: "dot" }
    | { kind: "cafe" }
    | { kind: "initials"; initials: string }
    | { kind: "logo"; initials: string; logo: string }
  );

export interface ChainMark {
  label: string;
  logo?: string | null | undefined;
}

export function chainMark(
  place: Place,
  counts: Map<string, number>,
  qids: Map<string, string>,
  logos: Record<string, string | null>,
): ChainMark | undefined {
  const key = chainKey(place, counts);
  if (!key) return undefined;
  const qid = qids.get(key);
  return {
    label: chainName(place) ?? key,
    ...(qid && { logo: logos[qid] }),
  };
}

export function markerSpec(
  place: Place,
  ring: string,
  chain: ChainMark | undefined,
): MarkerSpec {
  const base = { ring, visited: place.visits.length > 0 };
  if (place.review !== "cafe") return { ...base, kind: "dot" };
  if (!chain) return { ...base, kind: "cafe" };
  const initials = initialsOf(chain.label);
  return chain.logo
    ? { ...base, kind: "logo", initials, logo: chain.logo }
    : { ...base, kind: "initials", initials };
}

export function markerKey(spec: MarkerSpec): string {
  return JSON.stringify(spec);
}
