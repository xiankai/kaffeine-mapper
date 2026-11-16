import { Place } from "../domain/types";
import { sleep } from "./overpass";

export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export interface GeocodeOptions {
  fetchImpl?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  near?: { lat: number; lng: number };
  onProgress?: (done: number, total: number) => void;
}

export function centroid(
  places: Place[],
): { lat: number; lng: number } | undefined {
  const located = places.filter((p) => p.located);
  if (located.length === 0) return undefined;
  return {
    lat: located.reduce((s, p) => s + p.lat, 0) / located.length,
    lng: located.reduce((s, p) => s + p.lng, 0) / located.length,
  };
}

function searchUrl(
  name: string,
  near: { lat: number; lng: number } | undefined,
): string {
  const params = new URLSearchParams({ q: name, format: "jsonv2", limit: "1" });
  if (near) {
    const d = 0.5;
    params.set(
      "viewbox",
      [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(","),
    );
  }
  return `${NOMINATIM_URL}?${params}`;
}

export async function geocodeUnlocated(
  places: Place[],
  options: GeocodeOptions = {},
): Promise<Place[]> {
  const { fetchImpl = fetch, wait = sleep, near, onProgress } = options;
  const pending = places.filter((p) => !p.located && p.name);
  const results: Place[] = [];
  for (const [index, place] of pending.entries()) {
    if (index > 0) await wait(1100);
    const response = await fetchImpl(searchUrl(place.name as string, near));
    const hits = response.ok
      ? ((await response.json()) as Array<{ lat: string; lon: string }>)
      : [];
    const hit = hits[0];
    results.push(
      hit
        ? {
            ...place,
            lat: Number(hit.lat),
            lng: Number(hit.lon),
            located: true,
          }
        : place,
    );
    onProgress?.(index + 1, pending.length);
  }
  return results;
}
