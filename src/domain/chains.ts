import { ConfirmKey, EVALUATED_FIELDS } from "./evaluations";
import { chainName, isChain } from "./insights";
import { normaliseName } from "./osm";
import {
  ChainDefaults,
  Dataset,
  ManualAttributes,
  Place,
  SLOTS,
} from "./types";

export type Chains = Record<string, ChainDefaults>;

export function chainKey(
  place: Place,
  counts: Map<string, number>,
): string | undefined {
  if (!isChain(place, counts)) return undefined;
  const name = chainName(place);
  return name ? normaliseName(name) || undefined : undefined;
}

export interface Inheritance {
  manual: ManualAttributes;
  inherited: ConfirmKey[];
}

function inheritSeats(own: ManualAttributes, chain: ManualAttributes) {
  const slots = SLOTS.filter(
    (s) => own.seats?.[s] === undefined && chain.seats?.[s] !== undefined,
  );
  if (slots.length === 0) return { slots, seats: {} };
  const inherited = Object.fromEntries(slots.map((s) => [s, chain.seats?.[s]]));
  return { slots, seats: { seats: { ...inherited, ...own.seats } } };
}

export function inheritManual(
  own: ManualAttributes,
  chain: ManualAttributes | undefined,
): Inheritance {
  if (!chain) return { manual: own, inherited: [] };
  const fields = EVALUATED_FIELDS.filter(
    (f) => own[f] === undefined && chain[f] !== undefined,
  );
  const { slots, seats } = inheritSeats(own, chain);
  return {
    manual: {
      ...own,
      ...Object.fromEntries(fields.map((f) => [f, chain[f]])),
      ...seats,
    },
    inherited: [...fields, ...slots],
  };
}

export function chainDefaultsOf(
  place: Place,
  counts: Map<string, number>,
  chains: Chains | undefined,
): ChainDefaults | undefined {
  const key = chainKey(place, counts);
  return key ? chains?.[key] : undefined;
}

export function withChainDefaults(
  place: Place,
  counts: Map<string, number>,
  chains: Chains | undefined,
): Place {
  const defaults = chainDefaultsOf(place, counts, chains);
  if (!defaults) return place;
  return {
    ...place,
    manual: inheritManual(place.manual, defaults.manual).manual,
  };
}

export function updateChain(
  dataset: Dataset,
  key: string,
  change: (defaults: ChainDefaults) => ChainDefaults,
): Dataset {
  const current = dataset.chains?.[key] ?? { manual: {} };
  return { ...dataset, chains: { ...dataset.chains, [key]: change(current) } };
}

export interface PlaceEntry<T> {
  kind: "place";
  item: T;
}

export interface ChainEntry<T> {
  kind: "chain";
  key: string;
  label: string;
  branches: T[];
}

export type ListEntry<T> = PlaceEntry<T> | ChainEntry<T>;

function collapseSingles<T>(entry: ListEntry<T>): ListEntry<T> {
  if (entry.kind === "chain" && entry.branches.length === 1)
    return { kind: "place", item: entry.branches[0] as T };
  return entry;
}

export function groupByChain<T extends { place: Place }>(
  items: T[],
  counts: Map<string, number>,
): ListEntry<T>[] {
  const entries: ListEntry<T>[] = [];
  const chains = new Map<string, ChainEntry<T>>();
  for (const item of items) {
    const key = chainKey(item.place, counts);
    const known = key ? chains.get(key) : undefined;
    if (known) {
      known.branches.push(item);
    } else if (key) {
      const label = chainName(item.place) as string;
      const entry: ChainEntry<T> = {
        kind: "chain",
        key,
        label,
        branches: [item],
      };
      chains.set(key, entry);
      entries.push(entry);
    } else {
      entries.push({ kind: "place", item });
    }
  }
  return entries.map(collapseSingles);
}
