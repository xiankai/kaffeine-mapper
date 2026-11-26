import { useEffect, useRef, useState } from "react";
import { GoogleTypeResult, needsGoogleCheck } from "../domain/triage";
import { Place } from "../domain/types";
import { classifyPlaces } from "../services/googleClassify";
import { fetchPlaceTypes } from "../services/googleMaps";
import { TaskStatus } from "../state/enrichment";
import { useStore } from "../state/store";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

function finishedText(done: number, stopped: boolean): string {
  return stopped
    ? `Stopped after ${done} places; progress is saved.`
    : `Checked ${done} places with Google. Any still in Needs review were unclear.`;
}

function useClassifier(
  apiKey: string,
  apply: (results: GoogleTypeResult[]) => void,
) {
  const [status, setStatus] = useState<TaskStatus>({ kind: "idle" });
  const abortRef = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => abortRef.current?.abort(), []);

  const start = async (places: Place[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({
      kind: "busy",
      text: `Asking Google about ${places.length} places…`,
    });
    try {
      const done = await classifyPlaces(places, {
        lookup: (placeId) => fetchPlaceTypes(apiKey, placeId),
        signal: controller.signal,
        onBatch: (results, finished, total) => {
          apply(results);
          setStatus({
            kind: "busy",
            text: `Checked ${finished} of ${total} places…`,
          });
        },
      });
      setStatus({
        kind: "done",
        text: finishedText(done, controller.signal.aborted),
      });
    } catch (error) {
      setStatus({ kind: "error", text: errorText(error) });
    } finally {
      abortRef.current = undefined;
    }
  };

  const stop = () => abortRef.current?.abort();
  return { status, running: status.kind === "busy", start, stop };
}

export function GoogleClassify({ apiKey }: { apiKey: string }) {
  const { dataset, applyGoogle } = useStore();
  const { status, running, start, stop } = useClassifier(apiKey, applyGoogle);
  if (!apiKey) return null;
  const pending = dataset.places.filter(needsGoogleCheck);
  return (
    <section className="step">
      <h2>4. Classify with Google</h2>
      <p>
        Timeline visits carry a Google place ID but no name or category. Google
        is asked for each pending place&apos;s category, and only the café /
        not-a-café verdict is kept. Your own decisions are never changed.
      </p>
      <button
        type="button"
        onClick={() => void start(pending)}
        disabled={running || pending.length === 0}
      >
        {pending.length
          ? `Classify ${pending.length} pending places with Google`
          : "No pending places to classify"}
      </button>
      {status.kind !== "idle" && (
        <div role="status" className={`status ${status.kind}`}>
          <span>{status.text}</span>
          {running && (
            <button type="button" onClick={stop}>
              Stop
            </button>
          )}
        </div>
      )}
    </section>
  );
}
