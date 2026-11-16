import { coordsFromMapsUrl, nameFromMapsUrl } from "./bookmarks";
import { Place } from "./types";

export const SHARED_LIST = "Shared";

export interface SharedLink {
  title?: string;
  text?: string;
  url?: string;
}

const URL_PATTERN = /https?:\/\/\S+/;

function firstUrl(link: SharedLink): string | undefined {
  return link.url?.trim() || link.text?.match(URL_PATTERN)?.[0];
}

function nameFromText(text: string | undefined): string | undefined {
  const lines = (text ?? "")
    .replace(new RegExp(URL_PATTERN, "g"), "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0];
}

function sharedName(link: SharedLink, url: string | undefined) {
  return (
    link.title?.trim() ||
    nameFromText(link.text) ||
    (url ? nameFromMapsUrl(url) : undefined)
  );
}

export function placeFromSharedLink(link: SharedLink): Place | undefined {
  const url = firstUrl(link);
  const name = sharedName(link, url);
  if (!name && !url) return undefined;
  const coords = url ? coordsFromMapsUrl(url) : undefined;
  return {
    id: `b:share:${url ?? name}`,
    ...(name && { name }),
    ...(url && { url }),
    lat: coords?.lat ?? 0,
    lng: coords?.lng ?? 0,
    located: coords !== undefined,
    sources: ["saved"],
    lists: [SHARED_LIST],
    visits: [],
    review: "pending",
    manual: {},
  };
}

export function isTimelineJson(text: string): boolean {
  return text.includes('"semanticSegments"');
}
