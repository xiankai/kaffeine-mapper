import { useEnrichment } from "../state/enrichment";

export function EnrichmentStatus() {
  const { status, running, stop } = useEnrichment();
  if (status.kind === "idle") return null;
  return (
    <div role="status" className={`status ${status.kind}`}>
      <span>{status.text}</span>
      {running && (
        <button type="button" onClick={stop}>
          Stop
        </button>
      )}
    </div>
  );
}
