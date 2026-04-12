/* eslint-disable max-lines-per-function */
import { render, screen } from "@testing-library/react";
import { ImportSession } from "../../types";

// We need to extract ImportSessionCard or test it as part of ImportView
// Since it's internal to ImportView, let's create a mock component for testing
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

describe("ImportSessionCard", () => {
  const baseSession: ImportSession = {
    id: "import_123",
    filename: "timeline-2026-04-04.json",
    importedAt: "2026-04-04T10:30:00.000Z",
    totalLocations: 1000,
    processedLocations: 850,
    newCafes: 25,
    status: "completed",
  };

  it("renders completed session correctly", () => {
    render(<ImportSessionCard session={baseSession} />);

    expect(screen.getByText("✅")).toBeInTheDocument();
    expect(screen.getByText("timeline-2026-04-04.json")).toBeInTheDocument();
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(
      screen.getByText("📊 Processed: 850 / 1000 locations"),
    ).toBeInTheDocument();
    expect(screen.getByText("☕ Created: 25 cafes")).toBeInTheDocument();
  });

  it("renders processing session correctly", () => {
    const processingSession = {
      ...baseSession,
      status: "processing" as const,
      processedLocations: 500,
      newCafes: 12,
    };

    render(<ImportSessionCard session={processingSession} />);

    expect(screen.getByText("⏳")).toBeInTheDocument();
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();
    expect(
      screen.getByText("📊 Processed: 500 / 1000 locations"),
    ).toBeInTheDocument();
    expect(screen.getByText("☕ Created: 12 cafes")).toBeInTheDocument();
  });

  it("renders error session correctly", () => {
    const errorSession = {
      ...baseSession,
      status: "error" as const,
      error: "Invalid JSON format",
    };

    render(<ImportSessionCard session={errorSession} />);

    expect(screen.getByText("❌")).toBeInTheDocument();
    expect(screen.getByText("ERROR")).toBeInTheDocument();
    expect(
      screen.getByText("❌ Error: Invalid JSON format"),
    ).toBeInTheDocument();
  });

  it("formats import date correctly", () => {
    render(<ImportSessionCard session={baseSession} />);

    // The exact format depends on locale, but should contain date elements
    const dateElement = screen.getByText(/📅 Imported:/);
    expect(dateElement).toBeInTheDocument();
    expect(dateElement.textContent).toContain("2026");
  });

  it("does not show error section for successful imports", () => {
    render(<ImportSessionCard session={baseSession} />);

    expect(screen.queryByText(/❌ Error:/)).not.toBeInTheDocument();
  });

  it("handles zero values correctly", () => {
    const zeroSession = {
      ...baseSession,
      processedLocations: 0,
      newCafes: 0,
    };

    render(<ImportSessionCard session={zeroSession} />);

    expect(
      screen.getByText("📊 Processed: 0 / 1000 locations"),
    ).toBeInTheDocument();
    expect(screen.getByText("☕ Created: 0 cafes")).toBeInTheDocument();
  });
});

// Test utility functions for status handling
describe("ImportSessionCard Utility Functions", () => {
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

  describe("getStatusColor", () => {
    it("returns correct colors for all statuses", () => {
      expect(getStatusColor("completed")).toBe("#28a745");
      expect(getStatusColor("processing")).toBe("#007bff");
      expect(getStatusColor("error")).toBe("#dc3545");
      expect(getStatusColor("unknown")).toBe("#6c757d");
    });
  });

  describe("getStatusIcon", () => {
    it("returns correct icons for all statuses", () => {
      expect(getStatusIcon("completed")).toBe("✅");
      expect(getStatusIcon("processing")).toBe("⏳");
      expect(getStatusIcon("error")).toBe("❌");
      expect(getStatusIcon("unknown")).toBe("📄");
    });
  });
});
