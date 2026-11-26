import { useEffect } from "react";
import { importPlacesLibrary } from "../services/googleMaps";

export function GooglePlaceCard({
  apiKey,
  placeId,
  mapsUrl,
}: {
  apiKey: string;
  placeId: string;
  mapsUrl: string;
}) {
  useEffect(() => {
    importPlacesLibrary(apiKey).catch(() => undefined);
  }, [apiKey]);
  return (
    <section className="google-card" aria-label="On Google Maps">
      <gmp-place-details-compact orientation="horizontal">
        <gmp-place-details-place-request place={placeId} />
        <gmp-place-all-content />
      </gmp-place-details-compact>
      <a href={mapsUrl} target="_blank" rel="noreferrer">
        Open in Google Maps
      </a>
    </section>
  );
}
