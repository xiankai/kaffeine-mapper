import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { Link } from "react-router-dom";
import { RankedPlace } from "../domain/filters";
import { displayName } from "../domain/insights";
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

export default function MapPanel({ ranked }: { ranked: RankedPlace[] }) {
  const shown = ranked.slice(0, MAX_MARKERS);
  const points = useMemo(
    () => shown.map((r) => [r.place.lat, r.place.lng] as [number, number]),
    [shown],
  );
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
          <CircleMarker
            key={place.id}
            center={[place.lat, place.lng]}
            radius={place.visits.length ? 7 : 6}
            pathOptions={{
              color: SCORE_COLORS[scoreClass(score.value)],
              fillOpacity: place.visits.length ? 0.85 : 0.25,
              weight: 2,
            }}
          >
            <Popup>
              <Link to={`/place/${encodeURIComponent(place.id)}`}>
                {displayName(place)}
              </Link>
              <br />
              Score {score.value ?? "?"} ·{" "}
              {place.visits.length ? `${place.visits.length} visits` : "saved"}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
