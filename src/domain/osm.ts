import { OsmMatch } from "./types";

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface Point {
  lat: number;
  lng: number;
}

export const KEPT_TAGS = [
  "name",
  "brand",
  "brand:wikidata",
  "opening_hours",
  "internet_access",
  "internet_access:fee",
  "internet_access:ssid",
  "power_supply",
  "socket",
  "outdoor_seating",
  "indoor_seating",
  "air_conditioning",
  "website",
  "cuisine",
  "amenity",
  "shop",
];

const CAFE_FILTERS = ['["amenity"="cafe"]', '["shop"="coffee"]'];

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export const CELL_DEG = 0.2;
const CELL_PAD_DEG = 0.002;

export function cellKey(p: Point): string {
  return `${Math.floor(p.lat / CELL_DEG)}:${Math.floor(p.lng / CELL_DEG)}`;
}

export function cellBBox(key: string): BBox {
  const [row, col] = key.split(":").map(Number) as [number, number];
  return {
    south: row * CELL_DEG - CELL_PAD_DEG,
    west: col * CELL_DEG - CELL_PAD_DEG,
    north: (row + 1) * CELL_DEG + CELL_PAD_DEG,
    east: (col + 1) * CELL_DEG + CELL_PAD_DEG,
  };
}

export function buildOverpassQuery(boxes: BBox[]): string {
  const clauses = boxes.flatMap((b) => {
    const box = [b.south, b.west, b.north, b.east]
      .map((n) => n.toFixed(5))
      .join(",");
    return CAFE_FILTERS.map((f) => `nwr${f}(${box});`);
  });
  return `[out:json][timeout:120];(${clauses.join("")});out center tags;`;
}

export function distanceM(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function elementPoint(el: OsmElement): Point | undefined {
  if (el.lat !== undefined && el.lon !== undefined)
    return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return undefined;
}

export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9぀-ヿ一-鿿]+/g, " ")
    .trim();
}

export function nameSimilarity(
  a: string | undefined,
  b: string | undefined,
): number {
  if (!a || !b) return 0;
  const wa = new Set(normaliseName(a).split(" ").filter(Boolean));
  const wb = new Set(normaliseName(b).split(" ").filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / Math.min(wa.size, wb.size);
}

function keptTags(tags: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tags).filter(
      ([k]) => KEPT_TAGS.includes(k) || k.startsWith("socket:"),
    ),
  );
}

export function matchNearest(
  point: Point,
  elements: OsmElement[],
  radiusM: number,
  expectedName?: string,
): OsmMatch | undefined {
  let best: { el: OsmElement; distance: number; rank: number } | undefined;
  for (const el of elements) {
    const p = elementPoint(el);
    if (!p) continue;
    const distance = distanceM(point, p);
    if (distance > radiusM) continue;
    const rank =
      distance / radiusM - nameSimilarity(expectedName, el.tags?.name);
    if (!best || rank < best.rank) best = { el, distance, rank };
  }
  if (!best) return undefined;
  const tags = keptTags(best.el.tags ?? {});
  return {
    id: `${best.el.type}/${best.el.id}`,
    ...(tags.name && { name: tags.name }),
    distanceM: Math.round(best.distance),
    tags,
  };
}
