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
      screen.getByText("Nothing matches these filters in this area."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 places")).toBeInTheDocument();
  });
});

describe("ExplorePage area", () => {
  const near = (id: string, lat: number, lng: number, start: string) =>
    place({
      id,
      name: id,
      lat,
      lng,
      review: "cafe",
      visits: [visit(start)],
    });
  const places = [
    near("Shibuya", 35.66, 139.7, "2026-11-20"),
    near("Ginza", 35.67, 139.77, "2026-11-21"),
    near("Osaka", 34.69, 135.5, "2026-10-01"),
    near("London", 51.5, -0.12, "2025-01-01"),
  ];
  type Locate = Geolocation["getCurrentPosition"];
  type Success = Parameters<Locate>[0];
  type Failure = NonNullable<Parameters<Locate>[1]>;
  const getCurrentPosition = jest.fn<void, Parameters<Locate>>();
  const area = (name: RegExp) => screen.getByRole("button", { name });

  beforeEach(() => {
    localStorage.clear();
    getCurrentPosition.mockReset();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
  });

  it("starts on the recent area and can show everywhere", async () => {
    renderWithStore(<ExplorePage />, { places });
    expect(await screen.findByTestId("map")).toHaveTextContent("2 on map");
    expect(area(/Recent area/)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Within 30 km")).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await userEvent.click(area(/Everywhere/));
    expect(screen.getByTestId("map")).toHaveTextContent("4 on map");
    expect(localStorage.getItem("kaffeine-mapper:area")).toBe("everywhere");
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("Nothing matches these filters."),
    ).toBeInTheDocument();
  });

  it("centres on the device position for near me", async () => {
    getCurrentPosition.mockImplementation((ok: Success) =>
      ok({
        coords: { latitude: 34.7, longitude: 135.5 },
      } as GeolocationPosition),
    );
    renderWithStore(<ExplorePage />, { places });
    await userEvent.click(area(/Near me/));
    expect(await screen.findByTestId("map")).toHaveTextContent("1 on map");
    expect(screen.getByText("Osaka")).toBeInTheDocument();
  });

  it("falls back to the recent area when location is denied, and retries", async () => {
    getCurrentPosition.mockImplementation(
      (_ok: Success, fail?: Failure | null) =>
        fail?.({ code: 1 } as GeolocationPositionError),
    );
    localStorage.setItem("kaffeine-mapper:area", "near");
    renderWithStore(<ExplorePage />, { places });
    expect(
      await screen.findByText(/Couldn't get your location/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("map")).toHaveTextContent("2 on map");
    await userEvent.click(area(/Recent area/));
    await userEvent.click(area(/Near me/));
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("says when locating is pending", async () => {
    renderWithStore(<ExplorePage />, { places });
    await userEvent.click(area(/Near me/));
    expect(screen.getByText("Finding you…")).toBeInTheDocument();
  });

  it("ignores a stored value that isn't a mode, and storage that throws", async () => {
    localStorage.setItem("kaffeine-mapper:area", "mars");
    const { unmount } = renderWithStore(<ExplorePage />, { places });
    expect(area(/Recent area/)).toHaveAttribute("aria-pressed", "true");
    unmount();
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
    renderWithStore(<ExplorePage />, { places });
    expect(area(/Recent area/)).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(area(/Near me/));
    expect(
      await screen.findByText(/Couldn't get your location/),
    ).toBeInTheDocument();
    spy.mockRestore();
    jest.restoreAllMocks();
  });
});
