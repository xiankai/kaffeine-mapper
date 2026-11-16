import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { osm, place, visit } from "../../test/fixtures";
import { PlaceCard } from "../PlaceCard";
import { scoreClass } from "../scoreClass";

describe("PlaceCard", () => {
  it("shows score, status tags and metric hints", () => {
    render(
      <MemoryRouter>
        <PlaceCard
          ranked={{
            place: place({
              id: "g:a b",
              name: "Kiln",
              lists: ["Laptop"],
              visits: [visit("x")],
              osm: osm({ brand: "B" }),
            }),
            score: {
              value: 80,
              coverage: 0.5,
              metrics: { sockets: 1, wifi: 0.7, hours: 0.25 },
            },
          }}
          chainCounts={new Map()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/place/g%3Aa%20b",
    );
    expect(screen.getByText("80")).toHaveClass("score-high");
    expect(screen.getByText("1 visits")).toBeInTheDocument();
    expect(screen.getByText("chain")).toBeInTheDocument();
    expect(screen.getByText("unreviewed")).toBeInTheDocument();
    expect(screen.getByText("🔌 100")).toBeInTheDocument();
    expect(screen.getByText("50% known")).toBeInTheDocument();
  });

  it("renders unknown scores", () => {
    render(
      <MemoryRouter>
        <PlaceCard
          ranked={{
            place: place({ review: "cafe" }),
            score: { coverage: 0, metrics: {} },
          }}
          chainCounts={new Map()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("?")).toHaveClass("score-unknown");
    expect(screen.queryByText("unreviewed")).not.toBeInTheDocument();
  });

  it("asks for a pick when several cafés are candidates", () => {
    render(
      <MemoryRouter>
        <PlaceCard
          ranked={{
            place: place({ osmCandidates: [osm({ name: "A" })] }),
            score: { coverage: 0, metrics: {} },
          }}
          chainCounts={new Map()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("pick café")).toBeInTheDocument();
    expect(screen.queryByText("unreviewed")).not.toBeInTheDocument();
  });

  it("bands scores", () => {
    expect([70, 45, 44, undefined].map(scoreClass)).toEqual([
      "score-high",
      "score-mid",
      "score-low",
      "score-unknown",
    ]);
  });
});
