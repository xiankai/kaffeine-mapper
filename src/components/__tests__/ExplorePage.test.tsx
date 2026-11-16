import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { osm, place, visit } from "../../test/fixtures";
import { renderWithStore } from "../../test/render";
import { ExplorePage } from "../ExplorePage";

jest.mock("../MapPanel", () => ({
  __esModule: true,
  default: ({ ranked }: { ranked: unknown[] }) => (
    <div data-testid="map">{ranked.length} on map</div>
  ),
}));

const cafes = Array.from({ length: 65 }, (_, i) =>
  place({
    id: `g:${i}`,
    name: `Cafe ${String(i).padStart(2, "0")}`,
    osm: osm({ opening_hours: "Mo-Su 08:00-20:00" }),
    visits: [visit(`2024-01-${i}`)],
  }),
);

describe("ExplorePage", () => {
  it("points to import when empty", () => {
    renderWithStore(<ExplorePage />);
    expect(
      screen.getByRole("link", { name: /Import your Timeline/ }),
    ).toBeInTheDocument();
  });

  it("lists ranked places with paging, the map and filters", async () => {
    renderWithStore(<ExplorePage />, {
      places: [...cafes, place({ id: "g:x", name: "Not a cafe" })],
    });
    expect(await screen.findByTestId("map")).toHaveTextContent("65 on map");
    expect(screen.getAllByRole("listitem")).toHaveLength(60);
    await userEvent.click(
      screen.getByRole("button", { name: /Show more \(5 left\)/ }),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(65);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("Nothing matches these filters."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 places")).toBeInTheDocument();
  });
});
