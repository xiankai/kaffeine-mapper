import { strFromU8, unzipSync } from "fflate";
import { parseSavedCsv, parseStarredGeoJson } from "./bookmarks";
import { Place } from "./types";

export const TAKEOUT_URL =
  "https://takeout.google.com/settings/takeout/custom/local_actions,save";

const BOOKMARK_FILE = /\.(csv|json|geojson)$/i;

function baseName(path: string): string {
  return (path.split("/").pop() ?? path).replace(BOOKMARK_FILE, "");
}

function parseEntry(path: string, text: string): Place[] {
  try {
    if (/\.csv$/i.test(path)) return parseSavedCsv(text, baseName(path));
    return parseStarredGeoJson(JSON.parse(text), baseName(path));
  } catch {
    return [];
  }
}

export interface TakeoutContents {
  places: Place[];
  lists: string[];
}

export function parseTakeoutZip(bytes: Uint8Array): TakeoutContents {
  const entries = unzipSync(bytes, {
    filter: (file) =>
      BOOKMARK_FILE.test(file.name) && !file.name.includes("__MACOSX"),
  });
  const lists: string[] = [];
  const places = Object.entries(entries).flatMap(([path, data]) => {
    const parsed = parseEntry(path, strFromU8(data));
    if (parsed.length) lists.push(baseName(path));
    return parsed;
  });
  return { places, lists };
}
