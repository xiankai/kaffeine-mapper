import { ChangeEvent, ReactNode, useRef, useState } from "react";
import { parseSavedCsv, parseStarredGeoJson } from "../domain/bookmarks";
import { MergeSummary } from "../domain/merge";
import { parseTakeoutZip } from "../domain/takeoutZip";
import { Dataset, Place } from "../domain/types";
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
  Object.assign(document.createElement("a"), {
    href: url,
    download: name,
  }).click();
  URL.revokeObjectURL(url);
}

function onFiles(handle: (files: File[]) => void) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length) handle(files);
  };
}

function useTask() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const progress = (text: string) => setStatus({ kind: "busy", text });
  const run = async (text: string, task: () => Promise<string>) => {
    progress(text);
    try {
      setStatus({ kind: "done", text: await task() });
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    }
  };
  return { status, busy: status.kind === "busy", progress, run };
}

function Step({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="step">
      <h2>{title}</h2>
      <p>{intro}</p>
      {children}
    </section>
  );
}

function FilePicker({
  label,
  accept,
  multiple = false,
  disabled,
  onPick,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  disabled: boolean;
  onPick: (files: File[]) => void;
}) {
  return (
    <label className="file">
      {label}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onFiles(onPick)}
        disabled={disabled}
      />
    </label>
  );
}

function BackupStep({
  dataset,
  busy,
  onRestore,
}: {
  dataset: Dataset;
  busy: boolean;
  onRestore: (files: File[]) => void;
}) {
  return (
    <Step
      title="Backup"
      intro={`${dataset.places.length} places stored. Export includes your notes and ratings.`}
    >
      <button
        type="button"
        onClick={() =>
          download("kaffeine-mapper.json", JSON.stringify(dataset))
        }
        disabled={!dataset.places.length}
      >
        Export backup
      </button>
      <FilePicker
        label="Restore backup"
        accept=".json,application/json"
        disabled={busy}
        onPick={onRestore}
      />
    </Step>
  );
}

function useImportActions() {
  const { dataset, importPlaces, applyEnriched, replaceDataset } = useStore();
  const { status, busy, progress, run } = useTask();
  const abort = useRef<AbortController>();
  const stale = dataset.places.filter((p) => needsEnrichment(p, new Date()));
  const unlocated = dataset.places.filter((p) => !p.located && p.name);

  const importTimeline = ([file]: File[]) =>
    run(`Reading ${file!.name}…`, async () => {
      const result = await parseTimelineFile(file!);
      return `${describe(importPlaces(result.places), "Timeline")} (${result.visitCount} visits scanned, ${result.places.length} candidate places)`;
    });

  const importBookmarks = (files: File[]) =>
    run(`Reading ${files.length} list(s)…`, async () => {
      const places = (await Promise.all(files.map(parseBookmarkFile))).flat();
      return describe(importPlaces(places), `${files.length} saved list(s)`);
    });

  const enrich = () => {
    abort.current = new AbortController();
    const { signal } = abort.current;
    let done = 0;
    run(`Matching ${stale.length} places against OpenStreetMap…`, async () => {
      const onBatch = (enriched: Place[], finished: number, total: number) => {
        done = finished;
        applyEnriched(enriched);
        progress(`Matched ${finished} of ${total} places…`);
      };
      try {
        await enrichPlaces(stale, { signal, onBatch });
      } catch (error) {
        if (signal.aborted)
          return `Stopped after ${done} places; progress is saved.`;
        throw error;
      }
      return `Checked ${stale.length} places against OpenStreetMap.`;
    });
  };

  const locate = () =>
    run(`Locating ${unlocated.length} saved places by name…`, async () => {
      const near = centroid(dataset.places);
      const located = await geocodeUnlocated(unlocated, {
        ...(near && { near }),
        onProgress: (done, total) => progress(`Located ${done} of ${total}…`),
      });
      applyEnriched(located);
      return `Located ${located.filter((p) => p.located).length} of ${unlocated.length} saved places. Review them before trusting the match.`;
    });

  const restore = ([file]: File[]) =>
    run("Restoring backup…", async () => {
      replaceDataset(parseDatasetFile(JSON.parse(await file!.text())));
      return "Backup restored.";
    });

  return {
    dataset,
    status,
    busy,
    abort,
    stale,
    unlocated,
    importTimeline,
    importBookmarks,
    enrich,
    locate,
    restore,
  };
}

export function ImportPage() {
  const {
    dataset,
    status,
    busy,
    abort,
    stale,
    unlocated,
    importTimeline,
    importBookmarks,
    enrich,
    locate,
    restore,
  } = useImportActions();
  return (
    <div className="import">
      <h1>Import</h1>
      <p className="muted">
        Everything stays in this browser. Only coordinates and place names go to
        OpenStreetMap for matching.
      </p>
      <GetDataGuide />
      <Step
        title="1. Places you've been"
        intro="Pick the Timeline JSON from your phone. Re-importing a newer export only adds new visits."
      >
        <FilePicker
          label="Timeline JSON"
          accept=".json,application/json"
          disabled={busy}
          onPick={importTimeline}
        />
      </Step>
      <Step
        title="2. Places you want to try"
        intro="Pick the Takeout .zip as it arrived, or individual list CSVs / GeoJSON files. Each list keeps its name."
      >
        <FilePicker
          label="Takeout zip or saved lists"
          accept=".zip,.csv,.json,.geojson,application/zip,text/csv,application/json"
          multiple
          disabled={busy}
          onPick={importBookmarks}
        />
        {unlocated.length > 0 && (
          <button type="button" onClick={locate} disabled={busy}>
            Locate {unlocated.length} saved places by name
          </button>
        )}
      </Step>
      <Step
        title="3. Enrich from OpenStreetMap"
        intro="Finds which places are cafés and pulls opening hours, brand (chain), wi-fi and power tags. Data older than 30 days is refreshed."
      >
        <button
          type="button"
          onClick={enrich}
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
      </Step>
      <BackupStep dataset={dataset} busy={busy} onRestore={restore} />
      {status.kind !== "idle" && (
        <p role="status" className={`status ${status.kind}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
