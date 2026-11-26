import { fireEvent, screen, waitFor } from "@testing-library/react";
import { place } from "../../test/fixtures";
import { renderWithStore } from "../../test/render";
import { fetchPlaceTypes } from "../../services/googleMaps";
import { GoogleClassify } from "../GoogleClassify";

jest.mock("../../services/googleMaps", () => ({
  fetchPlaceTypes: jest.fn(),
}));
jest.mock("../../services/storage", () => ({
  ...jest.requireActual("../../services/storage"),
  saveDataset: jest.fn(async () => undefined),
}));

const lookup = fetchPlaceTypes as jest.Mock;
const pending = [
  place({ id: "g:a", googlePlaceId: "a" }),
  place({ id: "g:b", googlePlaceId: "b" }),
  place({ id: "g:c", googlePlaceId: "c", review: "cafe", reviewBy: "owner" }),
  place({ id: "g:d" }),
];
const button = () =>
  screen.getByRole("button", { name: /Classify|No pending/ });
const expectStatus = (text: string | RegExp) =>
  waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(text));

beforeEach(() => lookup.mockReset());

describe("GoogleClassify", () => {
  it("stays hidden without an API key", () => {
    const { container } = renderWithStore(<GoogleClassify apiKey="" />, {
      places: pending,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("classifies pending places that have a Google ID", async () => {
    lookup.mockImplementation(async (_key: string, id: string) =>
      id === "a" ? ["cafe"] : ["train_station"],
    );
    renderWithStore(<GoogleClassify apiKey="KEY" />, { places: pending });
    expect(button()).toHaveTextContent("Classify 2 pending places with Google");
    fireEvent.click(button());
    await expectStatus("Checked 2 places with Google.");
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(lookup).toHaveBeenCalledWith("KEY", "a");
    expect(button()).toHaveTextContent("No pending places to classify");
    expect(button()).toBeDisabled();
  });

  it("can be stopped", async () => {
    let release: (types: string[]) => void = () => undefined;
    lookup.mockImplementation(
      () => new Promise<string[]>((resolve) => (release = resolve)),
    );
    renderWithStore(<GoogleClassify apiKey="KEY" />, {
      places: [place({ id: "g:a", googlePlaceId: "a" })],
    });
    fireEvent.click(button());
    await expectStatus("Asking Google about 1 places…");
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    release(["cafe"]);
    await expectStatus("Stopped after 1 places; progress is saved.");
  });

  it("reports why a run stopped", async () => {
    lookup.mockRejectedValue(
      Object.assign(new Error("denied"), { code: "PERMISSION_DENIED" }),
    );
    renderWithStore(<GoogleClassify apiKey="KEY" />, { places: pending });
    fireEvent.click(button());
    await expectStatus(/Google refused the lookup/);
    expect(button()).toBeEnabled();
  });

  it("reports progress per batch", async () => {
    lookup.mockResolvedValue(["store"]);
    const many = Array.from({ length: 11 }, (_, i) =>
      place({ id: `g:${i}`, googlePlaceId: `${i}` }),
    );
    renderWithStore(<GoogleClassify apiKey="KEY" />, { places: many });
    fireEvent.click(button());
    await expectStatus("Checked 11 places with Google.");
  });
});
