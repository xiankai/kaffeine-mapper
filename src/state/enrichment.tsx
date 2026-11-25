import {
  createContext,
  ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Place } from "../domain/types";
import { enrichPlaces, STALE_AFTER_DAYS } from "../services/overpass";
import { useStore } from "./store";

export type TaskStatus =
  | { kind: "idle" }
  | { kind: "busy"; text: string }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

export interface Enrichment {
  status: TaskStatus;
  running: boolean;
  enrich: (places: Place[]) => void;
  stop: () => void;
}

const EnrichmentContext = createContext<Enrichment | undefined>(undefined);

export function isExpired(place: Place, now: Date): boolean {
  if (!place.located || place.review === "not-cafe" || !place.osmCheckedAt)
    return false;
  const ageDays = (now.getTime() - Date.parse(place.osmCheckedAt)) / 86400000;
  return ageDays > STALE_AFTER_DAYS;
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

function useRunner(applyOsm: (places: Place[]) => void) {
  const [status, setStatus] = useState<TaskStatus>({ kind: "idle" });
  const abortRef = useRef<AbortController | undefined>(undefined);

  const run = useCallback(
    async (places: Place[], intro: string, outro: string) => {
      // stack-reviewer-ignore: no status is set before this guard and enrich no longer runs through ImportPage's useTask, so an empty or overlapping request leaves the current status untouched
      if (abortRef.current || places.length === 0) return;
      const controller = new AbortController();
      abortRef.current = controller;
      let done = 0;
      setStatus({ kind: "busy", text: intro });
      try {
        await enrichPlaces(places, {
          signal: controller.signal,
          onBatch: (enriched, finished, total) => {
            done = finished;
            applyOsm(enriched);
            setStatus({
              kind: "busy",
              text: `Matched ${finished} of ${total} places…`,
            });
          },
        });
        setStatus({ kind: "done", text: outro });
      } catch (error) {
        setStatus(
          controller.signal.aborted
            ? {
                kind: "done",
                text: `Stopped after ${done} places; progress is saved.`,
              }
            : { kind: "error", text: errorText(error) },
        );
      } finally {
        abortRef.current = undefined;
      }
    },
    [applyOsm],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  return { status, run, stop };
}

export function EnrichmentProvider({
  children,
  refreshOnOpen = true,
}: {
  children: ReactNode;
  refreshOnOpen?: boolean;
}) {
  const { ready, dataset, applyOsm } = useStore();
  const { status, run, stop } = useRunner(applyOsm);
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (!ready || !refreshOnOpen || refreshedRef.current) return;
    refreshedRef.current = true;
    if (!navigator.onLine) return;
    const expired = dataset.places.filter((p) => isExpired(p, new Date()));
    run(
      expired,
      `Refreshing ${expired.length} places older than ${STALE_AFTER_DAYS} days from OpenStreetMap…`,
      `Refreshed ${expired.length} places from OpenStreetMap.`,
    );
  }, [ready, refreshOnOpen, dataset.places, run]);

  const enrich = useCallback(
    (places: Place[]) => {
      void run(
        places,
        `Matching ${places.length} places against OpenStreetMap…`,
        `Checked ${places.length} places against OpenStreetMap.`,
      );
    },
    [run],
  );

  const value = useMemo<Enrichment>(
    () => ({ status, running: status.kind === "busy", enrich, stop }),
    [status, enrich, stop],
  );

  return <EnrichmentContext value={value}>{children}</EnrichmentContext>;
}

export function useEnrichment(): Enrichment {
  const enrichment = use(EnrichmentContext);
  if (!enrichment)
    throw new Error("useEnrichment must be used inside EnrichmentProvider");
  return enrichment;
}
