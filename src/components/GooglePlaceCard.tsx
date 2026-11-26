import { useEffect, useRef, useState } from "react";
import { importPlacesLibrary } from "../services/googleMaps";

function useHideOnError() {
  const ref = useRef<HTMLElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const card = ref.current;
    const fail = () => setFailed(true);
    card?.addEventListener("gmp-error", fail);
    return () => card?.removeEventListener("gmp-error", fail);
  }, []);
  return { ref, failed };
}

export function GooglePlaceCard({
  apiKey,
  placeId,
  mapsUrl,
}: {
  apiKey: string;
  placeId: string;
  mapsUrl: string;
}) {
  const { ref, failed } = useHideOnError();
  useEffect(() => {
    importPlacesLibrary(apiKey).catch(() => undefined);
  }, [apiKey]);
  return (
    <section className="google-card" aria-label="On Google Maps">
      <gmp-place-details-compact
        ref={ref}
        orientation="horizontal"
        truncation-preferred=""
        hidden={failed}
      >
        <gmp-place-details-place-request place={placeId} />
        <gmp-place-content-config>
          <gmp-place-media lightbox-preferred="" />
          <gmp-place-rating />
          <gmp-place-type />
          <gmp-place-open-now-status />
          <gmp-place-attribution />
        </gmp-place-content-config>
      </gmp-place-details-compact>
      <a href={mapsUrl} target="_blank" rel="noreferrer">
        Open in Google Maps
      </a>
    </section>
  );
}
