import { ChangeEvent, useRef, useState } from "react";
import { parseSavedCsv, parseStarredGeoJson } from "../domain/bookmarks";
import { MergeSummary } from "../domain/merge";
import { parseTakeoutZip } from "../domain/takeoutZip";
import { Place } from "../domain/types";
import { centroid, geocodeUnlocated } from "../services/geocode";
import { enrichPlaces, needsEnrichment } from "../services/overpass";
import { parseTimelineFile } from "../services/parseTimelineFile";
import { parseDatasetFile } from "../services/storage";
import { useStore } from "../state/store";
import { GetDataGuide } from "./GetDataGuide";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; text: string }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

const listName = (file: File) =>
  file.name.replace(/\.(csv|json|geojson)$/i, "");

function describe(summary: MergeSummary, what: string): string {
  return `${what}: ${summary.added} new places, ${summary.updated} updated, ${summary.newVisits} new visits.`;
}

async function parseBookmarkFile(file: File): Promise<Place[]> {
  if (/\.zip$/i.test(file.name))
    return parseTakeoutZip(new Uint8Array(await file.arrayBuffer())).places;
  const text = await file.text();
  return /\.(geo)?json$/i.test(file.name)
    ? parseStarredGeoJson(JSON.parse(text), listName(file))
    : parseSavedCsv(text, listName(file));
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: name,
  });
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportPage() {
  const { dataset, importPlaces, applyEnriched, replaceDataset } = useStore();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const abort = useRef<AbortController>();
  const busy = status.kind === "busy";
  const stale = dataset.places.filter((p) => needsEnrichment(p, new Date()));
  const unlocated = dataset.places.filter((p) => !p.located && p.name);

  const run = async (text: string, task: () => Promise<string>) => {
    setStatus({ kind: "busy", text });
    try {
      setStatus({ kind: "done", text: await task() });
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const onTimeline = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    run(`Reading ${file.name}…`, async () => {
      const result = await parseTimelineFile(file);
      const summary = importPlaces(result.places);
      return `${describe(summary, "Timeline")} (${result.visitCount} visits scanned, ${result.places.length} candidate places)`;
    });
  };

  const onBookmarks = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    run(`Reading ${files.length} list(s)…`, async () => {
      const places = (await Promise.all(files.map(parseBookmarkFile))).flat();
      return describe(importPlaces(places), `${files.length} saved list(s)`);
    });
  };

  const onEnrich = () => {
    abort.current = new AbortController();
    const { signal } = abort.current;
    let done = 0;
    run(`Matching ${stale.length} places against OpenStreetMap…`, async () => {
      try {
        await enrichPlaces(stale, {
          signal,
          onBatch: (enriched, finished, total) => {
            done = finished;
            applyEnriched(enriched);
            setStatus({
              kind: "busy",
              text: `Matched ${finished} of ${total} places…`,
            });
          },
        });
      } catch (error) {
        if (signal.aborted)
          return `Stopped after ${done} places; progress is saved.`;
        throw error;
      }
      return `Checked ${stale.length} places against OpenStreetMap.`;
    });
  };

  const onLocate = () =>
    run(`Locating ${unlocated.length} saved places by name…`, async () => {
      const located = await geocodeUnlocated(unlocated, {
        ...(centroid(dataset.places) && {
          near: centroid(dataset.places) as { lat: number; lng: number },
        }),
        onProgress: (done, total) =>
          setStatus({ kind: "busy", text: `Located ${done} of ${total}…` }),
      });
      applyEnriched(located);
      return `Located ${located.filter((p) => p.located).length} of ${unlocated.length} saved places. Review them before trusting the match.`;
    });

  const onRestore = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    run("Restoring backup…", async () => {
      replaceDataset(parseDatasetFile(JSON.parse(await file.text())));
      return "Backup restored.";
    });
  };

  return (
    <div className="import">
      <h1>Import</h1>
      <p className="muted">
        Everything stays in this browser. Only coordinates and place names go to
        OpenStreetMap for matching.
      </p>

      <GetDataGuide />

      <section className="step">
        <h2>1. Places you&apos;ve been</h2>
        <p>
          Pick the Timeline JSON from your phone. Re-importing a newer export
          only adds new visits.
        </p>
        <label className="file">
          Timeline JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={onTimeline}
            disabled={busy}
          />
        </label>
      </section>

      <section className="step">
        <h2>2. Places you want to try</h2>
        <p>
          Pick the Takeout .zip as it arrived, or individual list CSVs / GeoJSON
          files. Each list keeps its name.
        </p>
        <label className="file">
          Takeout zip or saved lists
          <input
            type="file"
            accept=".zip,.csv,.json,.geojson,application/zip,text/csv,application/json"
            multiple
            onChange={onBookmarks}
            disabled={busy}
          />
        </label>
        {unlocated.length > 0 && (
          <button type="button" onClick={onLocate} disabled={busy}>
            Locate {unlocated.length} saved places by name
          </button>
        )}
      </section>

      <section className="step">
        <h2>3. Enrich from OpenStreetMap</h2>
        <p>
          Finds which places are cafés and pulls opening hours, brand (chain),
          wi-fi and power tags. Data older than 30 days is refreshed.
        </p>
        <button
          type="button"
          onClick={onEnrich}
          disabled={busy || stale.length === 0}
        >
          {stale.length
            ? `Enrich ${stale.length} places`
            : "Everything is up to date"}
        </button>
        {busy && abort.current && (
          <button type="button" onClick={() => abort.current?.abort()}>
            Stop
          </button>
        )}
      </section>

      <section className="step">
        <h2>Backup</h2>
        <p>
          {dataset.places.length} places stored. Export includes your notes and
          ratings.
        </p>
        <button
          type="button"
          onClick={() =>
            download("kaffeine-mapper.json", JSON.stringify(dataset))
          }
          disabled={!dataset.places.length}
        >
          Export backup
        </button>
        <label className="file">
          Restore backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={onRestore}
            disabled={busy}
          />
        </label>
      </section>

      {status.kind !== "idle" && (
        <p role="status" className={`status ${status.kind}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
