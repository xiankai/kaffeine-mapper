import { strToU8, zipSync } from "fflate";
import { Place, Visit } from "../domain/types";

export function visit(
  start: string,
  durationMin = 60,
  localDay = 2,
  localMinute = 14 * 60,
): Visit {
  return { start, durationMin, localDay, localMinute };
}

export function place(overrides: Partial<Place> = {}): Place {
  return {
    id: "g:test",
    lat: 51.5,
    lng: -0.12,
    located: true,
    sources: ["timeline"],
    lists: [],
    visits: [],
    review: "pending",
    manual: {},
    ...overrides,
  };
}

export function osm(tags: Record<string, string> = {}, id = "node/1") {
  return { id, distanceM: 5, tags, ...(tags.name && { name: tags.name }) };
}

export function segment(
  placeId: string,
  start: string,
  end: string,
  extra: Record<string, unknown> = {},
) {
  return {
    startTime: start,
    endTime: end,
    startTimeTimezoneUtcOffsetMinutes: 0,
    visit: {
      hierarchyLevel: 0,
      probability: 0.8,
      topCandidate: {
        placeId,
        semanticType: "UNKNOWN",
        probability: 0.5,
        placeLocation: { latLng: "51.5000000°, -0.1200000°" },
        ...extra,
      },
    },
  };
}

const starred = JSON.stringify({
  type: "FeatureCollection",
  features: [
    {
      geometry: { coordinates: [-0.1, 51.5] },
      properties: { location: { name: "Kiln" } },
    },
  ],
});

export function takeoutZip(): Uint8Array {
  return zipSync({
    "Takeout/Saved/Want to go.csv": strToU8(
      "Title,Note,URL,Tags,Comment\nBean There,,,,\n",
    ),
    "Takeout/Saved/Empty list.csv": strToU8("Title,Note,URL,Tags,Comment\n"),
    "Takeout/Maps (your places)/Saved Places.json": strToU8(starred),
    "Takeout/Maps (your places)/Reviews.json": strToU8("not json"),
    "Takeout/archive_browser.html": strToU8("<html></html>"),
    "__MACOSX/Takeout/Saved/._Want to go.csv": strToU8("junk"),
  });
}
