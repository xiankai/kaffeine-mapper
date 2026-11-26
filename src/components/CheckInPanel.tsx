import { useState } from "react";
import { CHECKIN_RADIUS_M, freshness, nearbyPlaces } from "../domain/checkin";
import { displayName } from "../domain/insights";
import { Point } from "../domain/osm";
import { Place } from "../domain/types";

const POSITION_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 60 * 1000,
  timeout: 15 * 1000,
};

type Locate =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "unavailable" }
  | { kind: "found"; here: Point };

function deviceGeolocation(): Geolocation | undefined {
  return navigator.geolocation as Geolocation | undefined;
}

export function FreshnessLine({ places }: { places: Place[] }) {
  const { timelineUpTo, checkinsSince } = freshness(places);
  const timeline = timelineUpTo
    ? `Timeline up to ${timelineUpTo.slice(0, 10)}`
    : "No Timeline import yet";
  const checkins = `${checkinsSince} check-in${checkinsSince === 1 ? "" : "s"}${timelineUpTo ? " since" : ""}`;
  return (
    <p className="freshness muted">
      {timeline} · {checkins}
    </p>
  );
}

function Suggestions({
  places,
  here,
  onPick,
}: {
  places: Place[];
  here: Point;
  onPick: (id: string) => void;
}) {
  const nearby = nearbyPlaces(places, here);
  if (nearby.length === 0) {
    return (
      <p className="muted">
        No known place within {CHECKIN_RADIUS_M} m. Adding a new place from
        OpenStreetMap isn&apos;t supported yet.
      </p>
    );
  }
  return (
    <fieldset className="chips">
      <legend>Where are you?</legend>
      {nearby.map(({ place, distance }) => (
        <button key={place.id} type="button" onClick={() => onPick(place.id)}>
          {displayName(place)} ({Math.round(distance)} m)
        </button>
      ))}
    </fieldset>
  );
}

export function CheckInPanel({
  places,
  onCheckIn,
}: {
  places: Place[];
  onCheckIn: (id: string) => void;
}) {
  const [locate, setLocate] = useState<Locate>({ kind: "idle" });

  const findMe = () => {
    const geolocation = deviceGeolocation();
    if (!geolocation) return setLocate({ kind: "unavailable" });
    setLocate({ kind: "locating" });
    geolocation.getCurrentPosition(
      ({ coords }) =>
        setLocate({
          kind: "found",
          here: { lat: coords.latitude, lng: coords.longitude },
        }),
      () => setLocate({ kind: "unavailable" }),
      POSITION_OPTIONS,
    );
  };

  const pick = (id: string) => {
    setLocate({ kind: "idle" });
    onCheckIn(id);
  };

  return (
    <section className="checkin" aria-label="Check in">
      <button
        type="button"
        onClick={findMe}
        disabled={locate.kind === "locating"}
      >
        📍 I&apos;m here
      </button>
      {locate.kind === "locating" && <p className="muted">Finding you…</p>}
      {locate.kind === "unavailable" && (
        <p className="muted">
          Couldn&apos;t get your location. Open the place and tap I&apos;m here
          there instead.
        </p>
      )}
      {locate.kind === "found" && (
        <Suggestions places={places} here={locate.here} onPick={pick} />
      )}
    </section>
  );
}
