import { fireEvent, screen } from "@testing-library/react";
import { place } from "../../test/fixtures";
import { renderWithStore } from "../../test/render";
import { importPlacesLibrary } from "../../services/googleMaps";
import { ImportPage } from "../ImportPage";
import { PlaceDetail } from "../PlaceDetail";

jest.mock("../../config", () => ({
  GOOGLE_CLIENT_ID: "",
  GOOGLE_MAPS_API_KEY: "KEY",
}));
jest.mock("../../services/googleMaps", () => ({
  importPlacesLibrary: jest.fn(async () => ({})),
  fetchPlaceTypes: jest.fn(),
}));
jest.mock("../../services/parseTimelineFile", () => ({
  parseTimelineFile: jest.fn(),
}));
jest.mock("../../services/shareInbox", () => ({
  takeShared: jest.fn(async () => ({ files: [], links: [] })),
}));
jest.mock("../../services/storage", () => ({
  ...jest.requireActual("../../services/storage"),
  saveDataset: jest.fn(async () => undefined),
}));

const show = (places: ReturnType<typeof place>[], id: string) =>
  renderWithStore(<PlaceDetail />, {
    places,
    path: "/place/:id",
    route: `/place/${encodeURIComponent(id)}`,
  });

describe("with a Google Maps key", () => {
  it("shows Google's place card for places with a Google ID", () => {
    const { container } = show(
      [place({ id: "g:abc", googlePlaceId: "abc" })],
      "g:abc",
    );
    expect(importPlacesLibrary).toHaveBeenCalledWith("KEY");
    expect(
      container.querySelector("gmp-place-details-place-request"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open in Google Maps" }),
    ).toHaveAttribute("href", expect.stringContaining("place_id:abc"));
  });

  it("swallows a failed library load", () => {
    (importPlacesLibrary as jest.Mock).mockRejectedValueOnce(new Error("x"));
    show([place({ id: "g:abc", googlePlaceId: "abc" })], "g:abc");
    expect(
      screen.getByRole("region", { name: "On Google Maps" }),
    ).toBeInTheDocument();
  });

  it("shows nothing new for places without a Google ID", () => {
    show([place({ id: "b:x", name: "Kiln" })], "b:x");
    expect(
      screen.queryByRole("region", { name: "On Google Maps" }),
    ).not.toBeInTheDocument();
  });

  it("explains Google verdicts and lets the owner undo them", () => {
    show(
      [
        place({
          id: "g:abc",
          googlePlaceId: "abc",
          review: "not-cafe",
          reviewBy: "google",
        }),
      ],
      "g:abc",
    );
    expect(
      screen.getByText(/Marked not a café: Google lists it/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Unsure" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("names Google confirmations", () => {
    show(
      [
        place({
          id: "g:abc",
          googlePlaceId: "abc",
          review: "cafe",
          reviewBy: "google",
        }),
      ],
      "g:abc",
    );
    expect(screen.getByText(/Google lists it as a café/)).toBeInTheDocument();
  });

  it("tells the import page that Google only gets place IDs", () => {
    renderWithStore(<ImportPage />);
    expect(
      screen.getByText(/gets the place IDs being looked up/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "4. Classify with Google" }),
    ).toBeInTheDocument();
  });
});
