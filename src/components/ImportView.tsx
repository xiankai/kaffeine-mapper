import React, { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { ImportSession, CafeLocation } from "../types";

interface TimelineVisit {
  startTime: string;
  endTime: string;
  visit: {
    hierarchyLevel: number;
    probability: number;
    topCandidate: {
      placeId: string;
      semanticType: string;
      probability: number;
      placeLocation: { latLng: string };
      name?: string;
    };
  };
}

interface TimelineData {
  semanticSegments: TimelineVisit[];
}

interface ProcessingStats {
  total: number;
  processed: number;
  created: number;
}

type AddCafeFn = (
  cafe: Omit<CafeLocation, "id" | "createdAt" | "updatedAt" | "totalVisits">,
) => void;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function parseCoordinates(s: string): { lat: number; lng: number } {
  const [latStr = "", lngStr = ""] = s.split(", ");
  return {
    lat: parseFloat(latStr.replace("°", "")),
    lng: parseFloat(lngStr.replace("°", "")),
  };
}

function calculateVisitDuration(start: string, end: string): number {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
}

function isLikelyCafe(visit: TimelineVisit): boolean {
  const dur = calculateVisitDuration(visit.startTime, visit.endTime);
  return (
    visit.visit.topCandidate.semanticType === "UNKNOWN" &&
    dur >= 15 &&
    dur <= 240 &&
    visit.visit.probability > 0.3
  );
}

function createCafeFromVisit(
  visit: TimelineVisit,
): Omit<CafeLocation, "id" | "createdAt" | "updatedAt" | "totalVisits"> {
  const coords = parseCoordinates(
    visit.visit.topCandidate.placeLocation.latLng,
  );
  const duration = calculateVisitDuration(visit.startTime, visit.endTime);
  return {
    name:
      visit.visit.topCandidate.name ||
      `Location ${visit.visit.topCandidate.placeId.slice(-8)}`,
    address: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
    coordinates: { latitude: coords.lat, longitude: coords.lng },
    visits: [
      {
        id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        visitedAt: visit.startTime,
        duration,
        notes: `Imported from Google Timeline (${duration} min visit)`,
        photos: [],
      },
    ],
    isFavorite: false,
    tags: ["imported"],
    notes: `Google Place ID: ${visit.visit.topCandidate.placeId}`,
  };
}

function groupVisitsByPlaceId(
  visits: TimelineVisit[],
): Record<string, TimelineVisit[]> {
  const groups: Record<string, TimelineVisit[]> = {};
  visits.forEach((v) => {
    const id = v.visit.topCandidate.placeId;
    if (!groups[id]) groups[id] = [];
    groups[id]!.push(v);
  });
  return groups;
}

function createErrorSession(file: File, error: string): ImportSession {
  return {
    id: `import_${Date.now()}`,
    filename: file.name,
    importedAt: new Date().toISOString(),
    totalLocations: 0,
    processedLocations: 0,
    newCafes: 0,
    status: "error",
    error,
  };
}

// ─── Async processing ─────────────────────────────────────────────────────────

type ProcessCbs = {
  addCafe: AddCafeFn;
  setProcessingStats: (v: ProcessingStats | null) => void;
};

async function processCafeGroups(
  groups: Record<string, TimelineVisit[]>,
  total: number,
  { addCafe, setProcessingStats }: ProcessCbs,
): Promise<{ created: number; processed: number }> {
  let created = 0;
  let processed = 0;
  for (const locationVisits of Object.values(groups)) {
    const cafe = createCafeFromVisit(locationVisits[0]!);
    for (const v of locationVisits.slice(1)) {
      const dur = calculateVisitDuration(v.startTime, v.endTime);
      cafe.visits.push({
        id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        visitedAt: v.startTime,
        duration: dur,
        notes: `Imported from Google Timeline (${dur} min visit)`,
        photos: [],
      });
    }
    addCafe(cafe);
    created++;
    processed += locationVisits.length;
    setProcessingStats({ total, processed, created });
    if (created % 10 === 0) await new Promise((r) => setTimeout(r, 10));
  }
  return { created, processed };
}

async function processTimelineFile(
  file: File,
  addCafe: AddCafeFn,
  dispatch: ReturnType<typeof useApp>["dispatch"],
  setIsProcessing: (v: boolean) => void,
  setProcessingStats: (v: ProcessingStats | null) => void,
): Promise<void> {
  setIsProcessing(true);
  setProcessingStats({ total: 0, processed: 0, created: 0 });
  try {
    const data: TimelineData = JSON.parse(await file.text());
    if (!data.semanticSegments || !Array.isArray(data.semanticSegments)) {
      throw new Error(
        "Invalid timeline format. Expected semanticSegments array.",
      );
    }
    const visits = data.semanticSegments.filter(
      (s) => s.visit && isLikelyCafe(s),
    );
    const session: ImportSession = {
      id: `import_${Date.now()}`,
      filename: file.name,
      importedAt: new Date().toISOString(),
      totalLocations: data.semanticSegments.length,
      processedLocations: 0,
      newCafes: 0,
      status: "processing",
    };
    dispatch({ type: "ADD_IMPORT_SESSION", session });
    setProcessingStats({ total: visits.length, processed: 0, created: 0 });
    const { created, processed } = await processCafeGroups(
      groupVisitsByPlaceId(visits),
      visits.length,
      { addCafe, setProcessingStats },
    );
    dispatch({
      type: "UPDATE_IMPORT_SESSION",
      session: {
        ...session,
        processedLocations: processed,
        newCafes: created,
        status: "completed",
      },
    });
    alert(
      `Import completed! Created ${created} cafes from ${processed} visits.`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    alert(`Error processing file: ${msg}`);
    dispatch({
      type: "ADD_IMPORT_SESSION",
      session: createErrorSession(file, msg),
    });
  } finally {
    setIsProcessing(false);
    setProcessingStats(null);
  }
}

// ─── Sample data ──────────────────────────────────────────────────────────────

type SampleCafe = Omit<
  CafeLocation,
  "id" | "createdAt" | "updatedAt" | "totalVisits"
>;

const SAMPLE_CAFES: SampleCafe[] = [
  {
    name: "Blue Bottle Coffee",
    address: "315 Linden St, San Francisco, CA 94102",
    coordinates: { latitude: 37.7829, longitude: -122.4189 },
    visits: [
      {
        id: "visit_1",
        visitedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        rating: 4,
        notes: "Great cortado, a bit pricey but excellent beans",
        photos: [],
      },
    ],
    isFavorite: true,
    tags: ["specialty", "expensive", "sample-data"],
    notes: "High-end specialty coffee roaster",
  },
  {
    name: "Philz Coffee",
    address: "3101 24th St, San Francisco, CA 94110",
    coordinates: { latitude: 37.7529, longitude: -122.4141 },
    visits: [
      {
        id: "visit_2",
        visitedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        rating: 5,
        notes: "Love the personalized blends! Mint Mojito is amazing",
        photos: [],
      },
    ],
    isFavorite: true,
    tags: ["custom-blends", "friendly", "sample-data"],
    notes: "Known for custom coffee blends",
  },
  {
    name: "Local Corner Café",
    address: "1847 Union St, San Francisco, CA 94123",
    coordinates: { latitude: 37.7956, longitude: -122.4274 },
    visits: [
      {
        id: "visit_3",
        visitedAt: new Date(Date.now() - 86400000).toISOString(),
        rating: 3,
        notes: "Decent coffee, nice atmosphere for working",
        photos: [],
      },
    ],
    isFavorite: false,
    tags: ["work-friendly", "casual", "sample-data"],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilteringCriteria() {
  return (
    <div
      style={{
        background: "#f8f9fa",
        padding: "1rem",
        borderRadius: "8px",
        marginBottom: "1rem",
      }}
    >
      <strong>Filtering Criteria:</strong>
      <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
        <li>Visit duration: 15 minutes to 4 hours</li>
        <li>Location type: Unknown (non-home/work places)</li>
        <li>High location confidence ({">"}30%)</li>
      </ul>
    </div>
  );
}

function ExportGuide() {
  return (
    <details style={{ marginBottom: "1rem" }}>
      <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
        How to get your Google Timeline data
      </summary>
      <ol
        style={{
          color: "#666",
          lineHeight: 1.6,
          paddingLeft: "1.5rem",
          marginTop: "0.5rem",
        }}
      >
        <li>
          Go to{" "}
          <a
            href="https://takeout.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Takeout
          </a>
        </li>
        <li>{'Select "Maps (your places)" or "Location History"'}</li>
        <li>Choose JSON format and create export</li>
        <li>Download and extract the timeline JSON file</li>
        <li>
          {'Upload the file here (look for "Semantic Location History.json")'}
        </li>
      </ol>
    </details>
  );
}

function ImportInstructions() {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <p style={{ color: "#666", lineHeight: 1.6, marginBottom: "1rem" }}>
        Import your cafe visits from Google Timeline data. The import will
        automatically detect potential cafe visits based on duration and
        location patterns.
      </p>
      <FilteringCriteria />
      <ExportGuide />
    </div>
  );
}

function ProcessingStatsPanel({ stats }: { stats: ProcessingStats }) {
  return (
    <div
      style={{
        background: "#e3f2fd",
        padding: "1rem",
        borderRadius: "8px",
        marginBottom: "2rem",
        textAlign: "center",
      }}
    >
      <h4 style={{ margin: "0 0 0.5rem 0" }}>Processing Timeline Data...</h4>
      <div>
        📊 Processed: {stats.processed} / {stats.total} visits
      </div>
      <div>☕ Created: {stats.created} cafes</div>
      <div
        style={{
          background: "#fff",
          height: "8px",
          borderRadius: "4px",
          marginTop: "0.5rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#2196f3",
            height: "100%",
            width: `${(stats.processed / stats.total) * 100}%`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function UploadPromptText({ isProcessing }: { isProcessing: boolean }) {
  if (isProcessing) {
    return (
      <div>
        <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>
          Processing your timeline data...
        </p>
        <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
          This may take a moment for large files
        </p>
      </div>
    );
  }
  return (
    <div>
      <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>
        Drop your Google Timeline JSON file here
      </p>
      <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
        Or click to browse files
      </p>
    </div>
  );
}

interface FileUploadAreaProps {
  isDragOver: boolean;
  isProcessing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
}

function FileUploadArea({
  isDragOver,
  isProcessing,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: FileUploadAreaProps) {
  const style: React.CSSProperties = {
    border: `2px dashed ${isDragOver ? "#007bff" : "#ddd"}`,
    borderRadius: "8px",
    padding: "3rem",
    textAlign: "center",
    background: isDragOver ? "#f0f8ff" : "#fafafa",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginBottom: "2rem",
  };
  return (
    <div
      style={style}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
        {isProcessing ? "⏳" : "📁"}
      </div>
      <UploadPromptText isProcessing={isProcessing} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={(e) => onFileSelect(e.target.files)}
        style={{ display: "none" }}
        disabled={isProcessing}
      />
    </div>
  );
}

function SampleDataButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: "0.75rem 1.5rem",
          background: disabled ? "#ccc" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "1rem",
        }}
      >
        📍 Load Sample Data Instead
      </button>
      <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "#666" }}>
        Add some sample cafes to test the application
      </p>
    </div>
  );
}

function ImportHistory({ sessions }: { sessions: ImportSession[] }) {
  if (sessions.length === 0) return null;
  return (
    <div>
      <h3>Import History</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {sessions.map((session) => (
          <ImportSessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImportView() {
  const { state, addCafe, dispatch } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] =
    useState<ProcessingStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    if (!file.name.endsWith(".json")) {
      alert("Please select a JSON file from Google Timeline export.");
      return;
    }
    processTimelineFile(
      file,
      addCafe,
      dispatch,
      setIsProcessing,
      setProcessingStats,
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h2>📥 Import Google Timeline Data</h2>
      <ImportInstructions />
      {processingStats && <ProcessingStatsPanel stats={processingStats} />}
      <FileUploadArea
        isDragOver={isDragOver}
        isProcessing={isProcessing}
        fileInputRef={fileInputRef}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
      />
      <SampleDataButton
        disabled={isProcessing}
        onClick={() => {
          SAMPLE_CAFES.forEach((c) => addCafe(c));
          alert(`Added ${SAMPLE_CAFES.length} sample cafes!`);
        }}
      />
      <ImportHistory sessions={state.importSessions} />
    </div>
  );
}

// ─── Import session card ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  completed: "#28a745",
  processing: "#007bff",
  error: "#dc3545",
};

const STATUS_ICONS: Record<string, string> = {
  completed: "✅",
  processing: "⏳",
  error: "❌",
};

function ImportSessionCard({ session }: { session: ImportSession }) {
  const color = STATUS_COLORS[session.status] ?? "#6c757d";
  const icon = STATUS_ICONS[session.status] ?? "📄";
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "1rem",
        background: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>{icon}</span>
          <strong>{session.filename}</strong>
        </div>
        <div style={{ color, fontWeight: "bold", fontSize: "0.9rem" }}>
          {session.status.toUpperCase()}
        </div>
      </div>
      <div style={{ fontSize: "0.9rem", color: "#666" }}>
        <div>📅 Imported: {new Date(session.importedAt).toLocaleString()}</div>
        <div>
          📊 Processed: {session.processedLocations} / {session.totalLocations}{" "}
          locations
        </div>
        <div>☕ Created: {session.newCafes} cafes</div>
        {session.error && (
          <div style={{ color: "#dc3545", marginTop: "0.5rem" }}>
            ❌ Error: {session.error}
          </div>
        )}
      </div>
    </div>
  );
}
