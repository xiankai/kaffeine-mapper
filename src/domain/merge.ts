import { dropCoveredCheckins } from "./checkin";
import { Dataset, Evaluation, OsmMatch, Place, Visit } from "./types";

const union = <T>(a: T[], b: T[]): T[] => [...new Set([...a, ...b])];

function mergeVisits(a: Visit[], b: Visit[]): Visit[] {
  const byStart = new Map(a.map((v) => [v.start, v]));
  b.forEach((v) => byStart.has(v.start) || byStart.set(v.start, v));
  return dropCoveredCheckins(
    [...byStart.values()].sort((x, y) => x.start.localeCompare(y.start)),
  );
}

function mergeEvaluations(
  a: Evaluation[] | undefined,
  b: Evaluation[] | undefined,
): Pick<Place, "evaluations"> {
  if (!a && !b) return {};
  const byAt = new Map([...(b ?? []), ...(a ?? [])].map((e) => [e.at, e]));
  return {
    evaluations: [...byAt.values()].sort((x, y) => x.at.localeCompare(y.at)),
  };
}

function preferLocated(
  existing: Place,
  incoming: Place,
): Pick<Place, "lat" | "lng" | "located"> {
  const source = existing.located || !incoming.located ? existing : incoming;
  return { lat: source.lat, lng: source.lng, located: source.located };
}

export function mergePlace(existing: Place, incoming: Place): Place {
  return {
    ...incoming,
    ...existing,
    ...preferLocated(existing, incoming),
    sources: union(existing.sources, incoming.sources),
    lists: union(existing.lists, incoming.lists),
    visits: mergeVisits(existing.visits, incoming.visits),
    manual: { ...incoming.manual, ...existing.manual },
    ...mergeEvaluations(existing.evaluations, incoming.evaluations),
    review: existing.review !== "pending" ? existing.review : incoming.review,
  };
}

function countNewVisits(before: Visit[], after: Visit[]): number {
  const known = new Set(before.map((v) => v.start));
  return after.filter((v) => !known.has(v.start)).length;
}

export interface MergeSummary {
  dataset: Dataset;
  added: number;
  updated: number;
  newVisits: number;
}

function aliasIndex(places: Place[]): Map<string, string> {
  const index = new Map<string, string>();
  places.forEach((p) => p.aliases?.forEach((alias) => index.set(alias, p.id)));
  return index;
}

export function mergeIntoDataset(
  dataset: Dataset,
  incoming: Place[],
): MergeSummary {
  const byId = new Map(dataset.places.map((p) => [p.id, p]));
  const aliases = aliasIndex(dataset.places);
  let added = 0;
  let updated = 0;
  let newVisits = 0;
  for (const incomingPlace of incoming) {
    const place = {
      ...incomingPlace,
      id: aliases.get(incomingPlace.id) ?? incomingPlace.id,
    };
    const existing = byId.get(place.id);
    if (!existing) {
      byId.set(place.id, place);
      added++;
      newVisits += place.visits.length;
      continue;
    }
    const merged = mergePlace(existing, place);
    newVisits += countNewVisits(existing.visits, merged.visits);
    byId.set(place.id, merged);
    updated++;
  }
  return {
    dataset: { ...dataset, places: [...byId.values()] },
    added,
    updated,
    newVisits,
  };
}

function survivorOrder(a: Place, b: Place): number {
  return (
    b.visits.length - a.visits.length || Number(b.located) - Number(a.located)
  );
}

export function linkByOsm(dataset: Dataset): Dataset {
  const groups = new Map<string, Place[]>();
  const loose: Place[] = [];
  for (const place of dataset.places) {
    if (!place.osm || place.review === "not-cafe") {
      loose.push(place);
      continue;
    }
    groups.set(place.osm.id, [...(groups.get(place.osm.id) ?? []), place]);
  }
  const linked = [...groups.values()].map((group) => {
    const [survivor, ...rest] = [...group].sort(survivorOrder) as [
      Place,
      ...Place[],
    ];
    return rest.reduce(
      (acc, p) => ({
        ...mergePlace(acc, p),
        id: acc.id,
        aliases: union(acc.aliases ?? [], [p.id, ...(p.aliases ?? [])]),
      }),
      survivor,
    );
  });
  return { ...dataset, places: [...linked, ...loose] };
}

export function updatePlace(
  dataset: Dataset,
  id: string,
  change: (p: Place) => Place,
): Dataset {
  return {
    ...dataset,
    places: dataset.places.map((p) => (p.id === id ? change(p) : p)),
  };
}

// stack-reviewer-ignore: a pick sets osm, so needsEnrichment's matcher check never fires and enrichment keeps it via confirmedMatch (covered in overpass.test)
export function pickCandidate(place: Place, chosen: OsmMatch): Place {
  const { osmCandidates: _candidates, ...rest } = place;
  return { ...rest, osm: chosen, review: "cafe" };
}

export function rejectCandidates(place: Place): Place {
  const { osmCandidates: _candidates, ...rest } = place;
  return { ...rest, review: "not-cafe" };
}
