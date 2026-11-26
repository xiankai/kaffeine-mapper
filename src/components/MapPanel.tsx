import { DivIcon, divIcon } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { RankedPlace } from "../domain/filters";
import { displayName } from "../domain/insights";
import {
  chainMark,
  chainWikidata,
  MarkerSpec,
  markerKey,
  markerSpec,
} from "../domain/markers";
import { chainKey } from "../domain/chains";
import { Place } from "../domain/types";
import { useBrandLogos } from "../hooks/useBrandLogos";
import { markerHtml, markerSize } from "./markerIcon";
import { SCORE_COLORS, scoreClass } from "./scoreClass";
import "leaflet/dist/leaflet.css";

const MAX_MARKERS = 1500;

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const key = points.length ? `${points.length}:${points[0]?.join()}` : "";
  useEffect(() => {
    if (points.length)
      map.fitBounds(points, { padding: [24, 24], maxZoom: 16 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const ICONS = new Map<string, DivIcon>();

function iconFor(spec: MarkerSpec): DivIcon {
  const key = markerKey(spec);
  const known = ICONS.get(key);
  if (known) return known;
  const size = markerSize(spec);
  const icon = divIcon({
    html: markerHtml(spec),
    className: "map-marker-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
  ICONS.set(key, icon);
  return icon;
}

interface Props {
  ranked: RankedPlace[];
  places: Place[];
  chainCounts: Map<string, number>;
}

export default function MapPanel({ ranked, places, chainCounts }: Props) {
  const shown = useMemo(() => ranked.slice(0, MAX_MARKERS), [ranked]);
  const points = useMemo(
    () => shown.map((r) => [r.place.lat, r.place.lng] as [number, number]),
    [shown],
  );
  const qids = useMemo(
    () => chainWikidata(places, chainCounts),
    [places, chainCounts],
  );
  const wanted = shown.flatMap(({ place }) => {
    const key = place.review === "cafe" && chainKey(place, chainCounts);
    const qid = key ? qids.get(key) : undefined;
    return qid ? [qid] : [];
  });
  const logos = useBrandLogos(wanted);
  return (
    <div className="map-panel">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {shown.map(({ place, score }) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            title={displayName(place)}
            icon={iconFor(
              markerSpec(
                place,
                SCORE_COLORS[scoreClass(score.value)] as string,
                chainMark(place, chainCounts, qids, logos),
              ),
            )}
          >
            <Popup>
              <Link to={`/place/${encodeURIComponent(place.id)}`}>
                {displayName(place)}
              </Link>
              <br />
              Score {score.value ?? "?"} ·{" "}
              {place.visits.length ? `${place.visits.length} visits` : "saved"}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
