import { useCallback, useEffect, useMemo, useState } from "react";
import { AreaMode, isAreaMode, recentAnchor } from "../domain/area";
import { Point } from "../domain/osm";
import { Place } from "../domain/types";

const STORAGE_KEY = "kaffeine-mapper:area";
const POSITION_OPTIONS = {
  maximumAge: 10 * 60 * 1000,
  timeout: 15 * 1000,
};

export type LocateStatus = "idle" | "locating" | "located" | "unavailable";

interface Fix {
  here?: Point;
  failed: boolean;
}

const NO_FIX: Fix = { failed: false };

function readMode(): AreaMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isAreaMode(stored) ? stored : "recent";
  } catch {
    return "recent";
  }
}

function writeMode(mode: AreaMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    return;
  }
}

function deviceGeolocation(): Geolocation | undefined {
  return navigator.geolocation as Geolocation | undefined;
}

function locateStatus(mode: AreaMode, fix: Fix): LocateStatus {
  if (mode !== "near") return "idle";
  if (fix.failed || !deviceGeolocation()) return "unavailable";
  return fix.here ? "located" : "locating";
}

function centerFor(
  mode: AreaMode,
  here: Point | undefined,
  recent: Point | undefined,
): Point | undefined {
  if (mode === "everywhere") return undefined;
  if (mode === "near") return here ?? recent;
  return recent;
}

export function useArea(places: Place[]) {
  const [mode, setMode] = useState<AreaMode>(readMode);
  const [fix, setFix] = useState<Fix>(NO_FIX);
  const recent = useMemo(() => recentAnchor(places), [places]);

  useEffect(() => {
    if (mode !== "near" || fix.here || fix.failed) return;
    deviceGeolocation()?.getCurrentPosition(
      ({ coords }) =>
        setFix({
          here: { lat: coords.latitude, lng: coords.longitude },
          failed: false,
        }),
      () => setFix({ failed: true }),
      POSITION_OPTIONS,
    );
  }, [mode, fix]);

  const chooseMode = useCallback((next: AreaMode) => {
    writeMode(next);
    setMode(next);
    setFix((current) => (current.failed ? NO_FIX : current));
  }, []);

  return {
    mode,
    chooseMode,
    status: locateStatus(mode, fix),
    center: centerFor(mode, fix.here, recent),
  };
}
