import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
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

function useRunner(applyEnriched: (places: Place[]) => void) {
  const [status, setStatus] = useState<TaskStatus>({ kind: "idle" });
  const abort = useRef<AbortController>();

  const run = useCallback(
    async (places: Place[], intro: string, outro: string) => {
      if (abort.current || places.length === 0) return;
      const controller = new AbortController();
      abort.current = controller;
      let done = 0;
      setStatus({ kind: "busy", text: intro });
      try {
        await enrichPlaces(places, {
          signal: controller.signal,
          onBatch: (enriched, finished, total) => {
            done = finished;
            applyEnriched(enriched);
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
        abort.current = undefined;
      }
    },
    [applyEnriched],
  );

  const stop = useCallback(() => abort.current?.abort(), []);
  return { status, run, stop };
}

export function EnrichmentProvider({
  children,
  refreshOnOpen = true,
}: {
  children: ReactNode;
  refreshOnOpen?: boolean;
}) {
  const { ready, dataset, applyEnriched } = useStore();
  const { status, run, stop } = useRunner(applyEnriched);
  const refreshed = useRef(false);

  useEffect(() => {
    if (!ready || !refreshOnOpen || refreshed.current) return;
    refreshed.current = true;
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

  return (
    <EnrichmentContext.Provider value={value}>
      {children}
    </EnrichmentContext.Provider>
  );
}

export function useEnrichment(): Enrichment {
  const enrichment = useContext(EnrichmentContext);
  if (!enrichment)
    throw new Error("useEnrichment must be used inside EnrichmentProvider");
  return enrichment;
}
