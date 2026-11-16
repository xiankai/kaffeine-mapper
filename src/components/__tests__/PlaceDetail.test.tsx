import { fireEvent, screen } from "@testing-library/react";
import { osm, place, visit } from "../../test/fixtures";
import { renderWithStore } from "../../test/render";
import { PlaceDetail } from "../PlaceDetail";

const full = place({
  id: "g:abc",
  googlePlaceId: "abc",
  address: "1 Road",
  lists: ["Laptop"],
  aliases: ["b:old"],
  osm: osm(
    {
      name: "Kiln",
      opening_hours: "Mo-Fr 08:00-18:00",
      internet_access: "wlan",
      "internet_access:fee": "no",
      power_supply: "yes",
    },
    "node/9",
  ),
  visits: [
    visit("2024-01-01T10:00:00Z", 45, 1, 600),
    visit("2024-01-06T10:00:00Z", 90, 6, 600),
  ],
});

const show = (places = [full], id = "g:abc") =>
  renderWithStore(<PlaceDetail />, {
    places,
    path: "/place/:id",
    route: `/place/${encodeURIComponent(id)}`,
  });

describe("PlaceDetail", () => {
  it("shows identity, hours, OSM tags, score breakdown and visit pattern", () => {
    show();
    expect(screen.getByRole("heading", { name: "Kiln" })).toBeInTheDocument();
    expect(screen.getByText("Independent")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google Maps" })).toHaveAttribute(
      "href",
      expect.stringContaining("place_id:abc"),
    );
    expect(
      screen.getByRole("link", { name: /OSM match: Kiln/ }),
    ).toHaveAttribute("href", "https://www.openstreetmap.org/node/9");
    expect(
      screen.getByRole("row", { name: /Mon 08:00–18:00/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Sun closed/ })).toBeInTheDocument();
    expect(
      screen.getByText(/internet wlan \(fee: no\) · power yes/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /2 visits · median 90 min · 50% on weekends · last 2024-01-06/,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("unknown").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("table", { name: /Visits by weekday/ }),
    ).toBeInTheDocument();
  });

  it("records the café review and manual attributes", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Not a café" }));
    expect(screen.getByRole("button", { name: "Not a café" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Power sockets" }), {
      target: { value: "many" },
    });
    expect(screen.getByRole("combobox", { name: "Power sockets" })).toHaveValue(
      "many",
    );
  });

  it("resolves aliases and handles saved places without OSM data", () => {
    show(
      [
        place({
          id: "b:x",
          aliases: ["b:old"],
          name: "Saved",
          url: "https://maps.example/x",
          googleNote: "try it",
          osm: osm({ opening_hours: "sunrise-sunset" }),
        }),
      ],
      "b:old",
    );
    expect(screen.getByRole("heading", { name: "Saved" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google Maps" })).toHaveAttribute(
      "href",
      "https://maps.example/x",
    );
    expect(screen.getByText("Unparsed: sunrise-sunset")).toBeInTheDocument();
    expect(
      screen.getByText(/Saved, never visited · “try it”/),
    ).toBeInTheDocument();
  });

  it("handles bare places and unknown ids", () => {
    show([place({ id: "g:bare", sources: ["saved"] })], "g:bare");
    expect(screen.getByText("Not in OpenStreetMap.")).toBeInTheDocument();
    expect(screen.getByText("Saved, never visited.")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Google Maps" }),
    ).not.toBeInTheDocument();
  });

  it("reports a missing place", () => {
    show([], "nope");
    expect(screen.getByText(/Place not found/)).toBeInTheDocument();
  });
});
