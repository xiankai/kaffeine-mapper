import { Place, PlaceSource } from "./types";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function coordsFromMapsUrl(
  url: string,
): { lat: number; lng: number } | undefined {
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /\/search\/(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
  }
  return undefined;
}

export function nameFromMapsUrl(url: string): string | undefined {
  const match = url.match(/\/maps\/place\/([^/@?]+)/);
  if (!match?.[1]) return undefined;
  return decodeURIComponent(match[1].replace(/\+/g, " ")).trim() || undefined;
}

function bookmarkPlace(input: {
  key: string;
  name: string | undefined;
  url: string | undefined;
  list: string;
  source: PlaceSource;
  coords: { lat: number; lng: number } | undefined;
}): Place {
  return {
    id: `b:${input.key}`,
    ...(input.name && { name: input.name }),
    ...(input.url && { url: input.url }),
    lat: input.coords?.lat ?? 0,
    lng: input.coords?.lng ?? 0,
    located: input.coords !== undefined,
    sources: [input.source],
    lists: [input.list],
    visits: [],
    review: "pending",
    manual: {},
  };
}

function headerIndex(rows: string[][]): number {
  return rows.findIndex((r) => {
    const cells = r.map((c) => c.trim().toLowerCase());
    return cells.includes("title") && cells.includes("url");
  });
}

export function parseSavedCsv(text: string, listName: string): Place[] {
  const rows = parseCsv(text);
  const header = headerIndex(rows);
  if (header < 0)
    throw new Error(
      `"${listName}" is not a Google saved-list CSV (no Title/URL header).`,
    );
  const columns = (rows[header] as string[]).map((c) => c.trim().toLowerCase());
  const col = (row: string[], name: string) =>
    row[columns.indexOf(name)]?.trim() ?? "";
  return rows.slice(header + 1).flatMap((row) => {
    const url = col(row, "url");
    const title = col(row, "title") || (url ? nameFromMapsUrl(url) : undefined);
    if (!url && !title) return [];
    const place = bookmarkPlace({
      key: url || `${listName}:${title}`,
      name: title,
      url: url || undefined,
      list: listName,
      source: "saved",
      coords: url ? coordsFromMapsUrl(url) : undefined,
    });
    const note = [col(row, "note"), col(row, "comment")]
      .filter(Boolean)
      .join(" · ");
    return [note ? { ...place, googleNote: note } : place];
  });
}

interface StarredFeature {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function starredLocation(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const location = props.location;
  if (Array.isArray(location))
    return (location[0] as Record<string, unknown>) ?? {};
  return (location as Record<string, unknown>) ?? {};
}

function featureCoords(
  feature: StarredFeature,
): { lat: number; lng: number } | undefined {
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return undefined;
  const [lng, lat] = coords.map(Number) as [number, number];
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    (lat === 0 && lng === 0)
  )
    return undefined;
  return { lat, lng };
}

export function parseStarredGeoJson(
  json: unknown,
  listName = "Starred places",
): Place[] {
  const features = (json as { features?: unknown })?.features;
  if (!Array.isArray(features))
    throw new Error("Starred places file is not GeoJSON (no features array).");
  return features.flatMap((raw: StarredFeature) => {
    const props = raw.properties ?? raw;
    const location = starredLocation(props);
    const url = str(props.google_maps_url);
    const coords = featureCoords(raw);
    const name = str(location.name) ?? (url ? nameFromMapsUrl(url) : undefined);
    if (!url && !name && !coords) return [];
    const place = bookmarkPlace({
      key: url ?? `${listName}:${name ?? `${coords?.lat},${coords?.lng}`}`,
      name,
      url,
      list: listName,
      source: "starred",
      coords,
    });
    const address = str(location.address);
    const rating =
      props.five_star_rating_published ?? props.five_star_rating_draft;
    const review =
      str(props.review_text_published) ?? str(props.review_text_draft);
    return [
      {
        ...place,
        ...(address && { address }),
        ...(typeof rating === "number" && { googleRating: rating }),
        ...(review && { googleNote: review }),
      },
    ];
  });
}
