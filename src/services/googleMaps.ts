const READY_CALLBACK = "kaffeineMapsReady";
const SCRIPT_URL = "https://maps.googleapis.com/maps/api/js";

interface PlaceInstance {
  types?: string[];
  fetchFields(options: { fields: string[] }): Promise<unknown>;
}

export interface PlacesLibrary {
  Place: new (options: { id: string }) => PlaceInstance;
}

interface MapsWindow {
  google?: { maps: { importLibrary(name: string): Promise<unknown> } };
  [READY_CALLBACK]?: () => void;
}

const mapsWindow = () => window as unknown as MapsWindow;

let loading: Promise<void> | undefined;

function injectScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    mapsWindow()[READY_CALLBACK] = () => resolve();
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      loading: "async",
      callback: READY_CALLBACK,
    });
    const script = document.createElement("script");
    script.src = `${SCRIPT_URL}?${params}`;
    script.async = true;
    script.onerror = () => reject(new Error("Couldn't load Google Maps."));
    document.head.append(script);
  });
}

export function loadMaps(apiKey: string): Promise<void> {
  loading ??= injectScript(apiKey).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

export async function importPlacesLibrary(
  apiKey: string,
): Promise<PlacesLibrary> {
  await loadMaps(apiKey);
  const maps = mapsWindow().google?.maps;
  if (!maps) throw new Error("Google Maps loaded without its library.");
  return (await maps.importLibrary("places")) as PlacesLibrary;
}

export async function fetchPlaceTypes(
  apiKey: string,
  placeId: string,
): Promise<string[]> {
  const { Place } = await importPlacesLibrary(apiKey);
  const place = new Place({ id: placeId });
  await place.fetchFields({ fields: ["types"] });
  return place.types ?? [];
}
