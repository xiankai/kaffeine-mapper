import { ChangeEvent, ReactNode, useEffect, useState } from "react";
import { GOOGLE_CLIENT_ID, GOOGLE_MAPS_API_KEY } from "../config";
import { AccessToken, DownloadBlockedError } from "../dataPortability";
import { parseSavedCsv, parseStarredGeoJson } from "../domain/bookmarks";
import { MergeSummary } from "../domain/merge";
import { isTimelineJson, placeFromSharedLink } from "../domain/share";
import { parseTakeoutZip } from "../domain/takeoutZip";
import { Dataset, Place } from "../domain/types";
import { centroid, geocodeUnlocated } from "../services/geocode";
import { describeExportError, pullSavedPlaces } from "../services/googleExport";
import { needsEnrichment } from "../services/overpass";
import { parseTimelineFile } from "../services/parseTimelineFile";
import { SharedItems, takeShared } from "../services/shareInbox";
import { parseDatasetFile } from "../services/storage";
import { TaskStatus, useEnrichment } from "../state/enrichment";
import { useStore } from "../state/store";
import { EnrichmentStatus } from "./EnrichmentStatus";
import { GetDataGuide } from "./GetDataGuide";
import { GoogleClassify } from "./GoogleClassify";
import { GooglePull } from "./GooglePull";
import { SharedPlaces } from "./SharedPlaces";

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

async function isTimelineFile(file: File): Promise<boolean> {
  return /\.json$/i.test(file.name) && isTimelineJson(await file.text());
}

async function placesFromShare(
  items: SharedItems,
): Promise<{ timelines: File[]; places: Place[]; linked: string[] }> {
  const timelineFlags = await Promise.all(items.files.map(isTimelineFile));
  const timelines = items.files.filter((_, i) => timelineFlags[i]);
  const lists = items.files.filter((_, i) => !timelineFlags[i]);
  const listPlaces = (await Promise.all(lists.map(parseBookmarkFile))).flat();
  const linkPlaces = items.links.flatMap((link) => {
    const shared = placeFromSharedLink(link);
    return shared ? [shared] : [];
  });
  return {
    timelines,
    places: [...listPlaces, ...linkPlaces],
    linked: linkPlaces.map((p) => p.id),
  };
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
  const [status, setStatus] = useState<TaskStatus>({ kind: "idle" });
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
  const enrichment = useEnrichment();
  const [archiveLinks, setArchiveLinks] = useState<string[]>([]);
  const [sharedIds, setSharedIds] = useState<string[]>([]);
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

  const importShared = (items: SharedItems) =>
    run("Importing what you shared…", async () => {
      const { timelines, places, linked } = await placesFromShare(items);
      setSharedIds(linked);
      const parts = [];
      for (const file of timelines) {
        const result = await parseTimelineFile(file);
        parts.push(describe(importPlaces(result.places), "Shared timeline"));
      }
      if (places.length)
        parts.push(describe(importPlaces(places), "Shared places"));
      return parts.join(" ") || "Nothing to import in what you shared.";
    });

  const enrich = () => enrichment.enrich(stale);

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

  const pullFromGoogle = (token: AccessToken) => {
    setArchiveLinks([]);
    run("Asking Google for your saved places…", async () => {
      try {
        const pulled = await pullSavedPlaces(token, { onStatus: progress });
        return describe(importPlaces(pulled.places), "Google saved places");
      } catch (error) {
        if (error instanceof DownloadBlockedError) setArchiveLinks(error.urls);
        throw new Error(describeExportError(error), { cause: error });
      }
    });
  };

  const signInFailed = (error: string) =>
    run("Signing in to Google…", async () => {
      throw new Error(error);
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
    enriching: enrichment.running,
    stale,
    unlocated,
    importTimeline,
    importBookmarks,
    importShared,
    pullFromGoogle,
    signInFailed,
    archiveLinks,
    sharedIds,
    enrich,
    locate,
    restore,
  };
}

function PrivacyNote() {
  return (
    <p className="muted">
      Everything stays in this browser. Coordinates and place names go to
      OpenStreetMap for matching. For chain logos, the chain is looked up on
      Wikidata and its website&apos;s icon is fetched through Google&apos;s
      favicon service.
      {GOOGLE_MAPS_API_KEY &&
        " Google is used for place lookups: it gets the place IDs being looked up with the usual request details (your IP address, this site's address and its API key), and the place page loads Google's card live. Nothing Google returns is stored except the café verdict."}
    </p>
  );
}

function useSharedInbox(onShared: (items: SharedItems) => void) {
  const [handler] = useState(() => onShared);
  useEffect(() => {
    takeShared()
      .then((items) => {
        if (items.files.length + items.links.length > 0) handler(items);
      })
      .catch(() => undefined);
  }, [handler]);
}

export function ImportPage() {
  const {
    dataset,
    status,
    busy,
    enriching,
    stale,
    unlocated,
    importTimeline,
    importBookmarks,
    importShared,
    pullFromGoogle,
    signInFailed,
    archiveLinks,
    sharedIds,
    enrich,
    locate,
    restore,
  } = useImportActions();
  useSharedInbox(importShared);
  return (
    <div className="import">
      <h1>Import</h1>
      <PrivacyNote />
      <SharedPlaces ids={sharedIds} />
      <GetDataGuide />
      <Step
        title="1. Places you've been"
        intro="Pick the Timeline JSON from your phone, or share it to Kaffeine Mapper once the app is installed. Re-importing a newer export only adds new visits."
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
        <GooglePull
          clientId={GOOGLE_CLIENT_ID}
          busy={busy}
          onPull={pullFromGoogle}
          onSignInError={signInFailed}
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
          disabled={busy || enriching || stale.length === 0}
        >
          {stale.length
            ? `Enrich ${stale.length} places`
            : "Everything is up to date"}
        </button>
        <EnrichmentStatus />
      </Step>
      <GoogleClassify apiKey={GOOGLE_MAPS_API_KEY} />
      <BackupStep dataset={dataset} busy={busy} onRestore={restore} />
      {status.kind !== "idle" && (
        <p role="status" className={`status ${status.kind}`}>
          {status.text}
        </p>
      )}
      {archiveLinks.length > 0 && (
        <ul className="archive-links">
          {archiveLinks.map((url, n) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                Google export archive {n + 1}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
