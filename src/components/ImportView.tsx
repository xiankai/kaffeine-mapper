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
      placeLocation: {
        latLng: string; // format: "lat°, lng°"
      };
      name?: string;
    };
  };
}

interface TimelineData {
  semanticSegments: TimelineVisit[];
}

export default function ImportView() {
  const { state, addCafe, dispatch } = useApp();
  const { importSessions } = state;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<{
    total: number;
    processed: number;
    created: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCoordinates = (
    latLngString: string,
  ): { lat: number; lng: number } => {
    // Parse "1.3005941°, 103.8493705°" format
    const [latStr = "", lngStr = ""] = latLngString.split(", ");
    return {
      lat: parseFloat(latStr.replace("°", "")),
      lng: parseFloat(lngStr.replace("°", "")),
    };
  };

  const calculateVisitDuration = (
    startTime: string,
    endTime: string,
  ): number => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.round((end - start) / (1000 * 60)); // duration in minutes
  };

  const isLikelyCafe = (visit: TimelineVisit): boolean => {
    const duration = calculateVisitDuration(visit.startTime, visit.endTime);
    const semanticType = visit.visit.topCandidate.semanticType;

    // Filter criteria for potential cafes:
    // - UNKNOWN semantic type (most cafes would be this)
    // - Duration between 15 minutes and 4 hours (typical cafe visits)
    // - High probability location match
    return (
      semanticType === "UNKNOWN" &&
      duration >= 15 &&
      duration <= 240 &&
      visit.visit.probability > 0.3
    );
  };

  const createCafeFromVisit = (
    visit: TimelineVisit,
  ): Omit<CafeLocation, "id" | "createdAt" | "updatedAt" | "totalVisits"> => {
    const coords = parseCoordinates(
      visit.visit.topCandidate.placeLocation.latLng,
    );
    const duration = calculateVisitDuration(visit.startTime, visit.endTime);

    return {
      name:
        visit.visit.topCandidate.name ||
        `Location ${visit.visit.topCandidate.placeId.slice(-8)}`,
      address: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
      coordinates: {
        latitude: coords.lat,
        longitude: coords.lng,
      },
      visits: [
        {
          id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          visitedAt: visit.startTime,
          duration: duration,
          notes: `Imported from Google Timeline (${duration} min visit)`,
          photos: [],
        },
      ],
      isFavorite: false,
      tags: ["imported"],
      notes: `Google Place ID: ${visit.visit.topCandidate.placeId}`,
    };
  };

  const processTimelineFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingStats({ total: 0, processed: 0, created: 0 });

    try {
      const text = await file.text();
      const data: TimelineData = JSON.parse(text);

      if (!data.semanticSegments || !Array.isArray(data.semanticSegments)) {
        throw new Error(
          "Invalid timeline format. Expected semanticSegments array.",
        );
      }

      // Create import session
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

      // Filter for potential cafe visits
      const visits = data.semanticSegments.filter(
        (segment) => segment.visit && isLikelyCafe(segment),
      );

      setProcessingStats({
        total: visits.length,
        processed: 0,
        created: 0,
      });

      // Group visits by placeId to handle multiple visits to same location
      const locationGroups: { [placeId: string]: TimelineVisit[] } = {};
      visits.forEach((visit) => {
        const placeId = visit.visit.topCandidate.placeId;
        if (!locationGroups[placeId]) {
          locationGroups[placeId] = [];
        }
        locationGroups[placeId].push(visit);
      });

      let created = 0;
      let processed = 0;

      // Process each unique location
      for (const [, locationVisits] of Object.entries(locationGroups)) {
        // Use the first visit to create the cafe, then add other visits
        const firstVisit = locationVisits[0]!;
        const cafe = createCafeFromVisit(firstVisit);

        // Add additional visits to the cafe
        if (locationVisits.length > 1) {
          for (let i = 1; i < locationVisits.length; i++) {
            const additionalVisit = locationVisits[i]!;
            const duration = calculateVisitDuration(
              additionalVisit.startTime,
              additionalVisit.endTime,
            );

            cafe.visits.push({
              id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              visitedAt: additionalVisit.startTime,
              duration: duration,
              notes: `Imported from Google Timeline (${duration} min visit)`,
              photos: [],
            });
          }
        }

        addCafe(cafe);
        created++;
        processed += locationVisits.length;

        setProcessingStats({
          total: visits.length,
          processed,
          created,
        });

        // Add small delay to show progress
        if (created % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Update session
      const completedSession: ImportSession = {
        ...session,
        processedLocations: processed,
        newCafes: created,
        status: "completed",
      };
      dispatch({ type: "UPDATE_IMPORT_SESSION", session: completedSession });

      alert(
        `Import completed! Created ${created} cafes from ${processed} visits.`,
      );
    } catch (error) {
      alert(
        `Error processing file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );

      // Update session with error
      const errorSession: ImportSession = {
        id: `import_${Date.now()}`,
        filename: file.name,
        importedAt: new Date().toISOString(),
        totalLocations: 0,
        processedLocations: 0,
        newCafes: 0,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      dispatch({ type: "ADD_IMPORT_SESSION", session: errorSession });
    } finally {
      setIsProcessing(false);
      setProcessingStats(null);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]!;
    if (!file.name.endsWith(".json")) {
      alert("Please select a JSON file from Google Timeline export.");
      return;
    }

    processTimelineFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const loadSampleData = () => {
    const sampleCafes = getSampleCafeData();
    sampleCafes.forEach((cafe) => addCafe(cafe));
    alert(`Added ${sampleCafes.length} sample cafes!`);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h2>📥 Import Google Timeline Data</h2>

      <div style={{ marginBottom: "2rem" }}>
        <p style={{ color: "#666", lineHeight: 1.6, marginBottom: "1rem" }}>
          Import your cafe visits from Google Timeline data. The import will
          automatically detect potential cafe visits based on duration and
          location patterns.
        </p>

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
              {
                'Upload the file here (look for "Semantic Location History.json")'
              }
            </li>
          </ol>
        </details>
      </div>

      {/* Processing Statistics */}
      {processingStats && (
        <div
          style={{
            background: "#e3f2fd",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          <h4 style={{ margin: "0 0 0.5rem 0" }}>
            Processing Timeline Data...
          </h4>
          <div>
            📊 Processed: {processingStats.processed} / {processingStats.total}{" "}
            visits
          </div>
          <div>☕ Created: {processingStats.created} cafes</div>
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
                width: `${(processingStats.processed / processingStats.total) * 100}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div
        style={{
          border: `2px dashed ${isDragOver ? "#007bff" : "#ddd"}`,
          borderRadius: "8px",
          padding: "3rem",
          textAlign: "center",
          background: isDragOver ? "#f0f8ff" : "#fafafa",
          cursor: "pointer",
          transition: "all 0.2s ease",
          marginBottom: "2rem",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
          {isProcessing ? "⏳" : "📁"}
        </div>

        {isProcessing ? (
          <div>
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>
              Processing your timeline data...
            </p>
            <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
              This may take a moment for large files
            </p>
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>
              Drop your Google Timeline JSON file here
            </p>
            <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
              Or click to browse files
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: "none" }}
          disabled={isProcessing}
        />
      </div>

      {/* Sample Data Button */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <button
          onClick={loadSampleData}
          disabled={isProcessing}
          style={{
            padding: "0.75rem 1.5rem",
            background: isProcessing ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: isProcessing ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          📍 Load Sample Data Instead
        </button>
        <p
          style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "#666" }}
        >
          Add some sample cafes to test the application
        </p>
      </div>

      {/* Import Sessions History */}
      {importSessions.length > 0 && (
        <div>
          <h3>Import History</h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {importSessions.map((session) => (
              <ImportSessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Import Session Card Component
interface ImportSessionCardProps {
  session: ImportSession;
}

function ImportSessionCard({ session }: ImportSessionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#28a745";
      case "processing":
        return "#007bff";
      case "error":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "processing":
        return "⏳";
      case "error":
        return "❌";
      default:
        return "📄";
    }
  };

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
          <span>{getStatusIcon(session.status)}</span>
          <strong>{session.filename}</strong>
        </div>
        <div
          style={{
            color: getStatusColor(session.status),
            fontWeight: "bold",
            fontSize: "0.9rem",
          }}
        >
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

function getSampleCafeData(): Omit<
  CafeLocation,
  "id" | "createdAt" | "updatedAt" | "totalVisits"
>[] {
  return [
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
          visitedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          rating: 3,
          notes: "Decent coffee, nice atmosphere for working",
          photos: [],
        },
      ],
      isFavorite: false,
      tags: ["work-friendly", "casual", "sample-data"],
    },
  ];
}
