import { fireEvent, screen, waitFor } from "@testing-library/react";
import { place, takeoutZip } from "../../test/fixtures";
import { renderWithStore } from "../../test/render";
import { geocodeUnlocated } from "../../services/geocode";
import { enrichPlaces, MATCHER_VERSION } from "../../services/overpass";
import { parseTimelineFile } from "../../services/parseTimelineFile";
import { takeShared } from "../../services/shareInbox";
import { ImportPage } from "../ImportPage";

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
jest.mock("../../services/geocode", () => ({
  ...jest.requireActual("../../services/geocode"),
  geocodeUnlocated: jest.fn(),
}));
jest.mock("../../services/overpass", () => ({
  ...jest.requireActual("../../services/overpass"),
  enrichPlaces: jest.fn(),
}));

const file = (name: string, text: string) => {
  const f = new File([text], name);
  Object.defineProperty(f, "text", { value: async () => text });
  return f;
};
const upload = (label: RegExp, files: File[]) =>
  fireEvent.change(screen.getByLabelText(label), { target: { files } });
const expectStatus = (text: string) =>
  waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(text));

describe("ImportPage", () => {
  it("imports a timeline through the worker", async () => {
    (parseTimelineFile as jest.Mock).mockResolvedValue({
      places: [place({ id: "g:1" })],
      visitCount: 10,
      segmentCount: 20,
    });
    renderWithStore(<ImportPage />);
    upload(/Timeline JSON/, [file("Timeline.json", "{}")]);
    await expectStatus(
      "Timeline: 1 new places, 0 updated, 0 new visits. (10 visits scanned, 1 candidate places)",
    );
    expect(
      screen.getByText(
        "1 places stored. Export includes your notes and ratings.",
      ),
    ).toBeInTheDocument();
  });

  it("reports parse errors", async () => {
    (parseTimelineFile as jest.Mock).mockRejectedValue(new Error("bad file"));
    renderWithStore(<ImportPage />);
    upload(/Timeline JSON/, [file("x.json", "")]);
    await expectStatus("bad file");
  });

  it("imports saved CSV and starred GeoJSON lists, then locates unlocated ones", async () => {
    renderWithStore(<ImportPage />);
    const csv = "Title,Note,URL,Tags,Comment\nKiln,,,,\n";
    const geo = JSON.stringify({
      features: [
        {
          geometry: { coordinates: [1, 2] },
          properties: { location: { name: "Star" } },
        },
      ],
    });
    upload(/saved lists/i, [
      file("Want to go.csv", csv),
      file("Starred.json", geo),
    ]);
    await expectStatus("2 saved list(s): 2 new places");
    (geocodeUnlocated as jest.Mock).mockImplementation(
      async (places, { onProgress }) => {
        onProgress(1, 1);
        return places.map((p: ReturnType<typeof place>) => ({
          ...p,
          located: true,
        }));
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Locate 1 saved places by name" }),
    );
    expect(
      await screen.findByText(/Located 1 of 1 saved places/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Locate/ }),
    ).not.toBeInTheDocument();
  });

  it("enriches stale places in batches and can stop", async () => {
    (enrichPlaces as jest.Mock).mockImplementation(
      async (places, { onBatch }) => {
        onBatch(
          [
            {
              ...places[0],
              osmCheckedAt: new Date().toISOString(),
              osmMatcher: MATCHER_VERSION,
            },
          ],
          1,
          2,
        );
        return places;
      },
    );
    renderWithStore(<ImportPage />, {
      places: [place({ id: "a" }), place({ id: "b", lat: 9 })],
    });
    fireEvent.click(screen.getByRole("button", { name: "Enrich 2 places" }));
    await expectStatus("Checked 2 places against OpenStreetMap.");
    expect(
      screen.getByRole("button", { name: "Enrich 1 places" }),
    ).toBeInTheDocument();

    let rejectRun: (e: Error) => void = () => undefined;
    (enrichPlaces as jest.Mock).mockImplementation(
      (_places, { signal, onBatch }) => {
        onBatch([], 0, 1);
        return new Promise((_, reject) => {
          rejectRun = reject;
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        });
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Enrich 1 places" }));
    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));
    await expectStatus("Stopped after 0 places; progress is saved.");

    (enrichPlaces as jest.Mock).mockImplementation(
      () => new Promise((_, reject) => (rejectRun = reject)),
    );
    fireEvent.click(screen.getByRole("button", { name: "Enrich 1 places" }));
    rejectRun(new Error("Overpass returned 400"));
    expect(
      await screen.findByText("Overpass returned 400"),
    ).toBeInTheDocument();
  });

  it("imports what was shared to the app", async () => {
    (parseTimelineFile as jest.Mock).mockResolvedValue({
      places: [place({ id: "g:shared" })],
      visitCount: 1,
      segmentCount: 1,
    });
    (takeShared as jest.Mock).mockResolvedValueOnce({
      files: [
        file("Timeline.json", '{"semanticSegments": []}'),
        file("Want to go.csv", "Title,Note,URL,Tags,Comment\nKiln,,,,\n"),
      ],
      links: [{ text: "Blue Door\nhttps://maps.app.goo.gl/x" }, { text: " " }],
    });
    renderWithStore(<ImportPage />);
    await expectStatus(
      "Shared timeline: 1 new places, 0 updated, 0 new visits. Shared places: 2 new places, 0 updated, 0 new visits.",
    );
    expect(
      screen.getByRole("button", { name: "Locate 2 saved places by name" }),
    ).toBeInTheDocument();
  });

  it("says so when a share holds nothing usable", async () => {
    (takeShared as jest.Mock).mockResolvedValueOnce({
      files: [],
      links: [{ text: " " }],
    });
    renderWithStore(<ImportPage />);
    await expectStatus("Nothing to import in what you shared.");
  });

  it("ignores an unreadable share inbox", async () => {
    (takeShared as jest.Mock).mockRejectedValueOnce(new Error("no caches"));
    renderWithStore(<ImportPage />);
    await waitFor(() => expect(takeShared).toHaveBeenCalled());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("exports and restores backups", async () => {
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    URL.createObjectURL = jest.fn(() => "blob:x");
    URL.revokeObjectURL = jest.fn();
    renderWithStore(<ImportPage />, {
      places: [
        place({
          osmCheckedAt: new Date().toISOString(),
          osmMatcher: MATCHER_VERSION,
        }),
      ],
    });
    expect(
      screen.getByRole("button", { name: "Everything is up to date" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Export backup" }));
    expect(click).toHaveBeenCalled();
    upload(/Restore backup/, [
      file("b.json", JSON.stringify({ version: 1, places: [] })),
    ]);
    await expectStatus("Backup restored.");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Export backup" }),
      ).toBeDisabled(),
    );
    upload(/Restore backup/, [file("b.json", "{}")]);
    expect(
      await screen.findByText("Not a kaffeine-mapper export."),
    ).toBeInTheDocument();
  });

  it("shows the guide and imports a whole Takeout zip", async () => {
    renderWithStore(<ImportPage />);
    expect(screen.getByRole("link", { name: /Open Takeout/ })).toHaveAttribute(
      "href",
      expect.stringContaining("local_actions,save"),
    );
    expect(screen.getAllByRole("img")).toHaveLength(3);
    const zip = new File([takeoutZip()], "takeout-2026.zip");
    upload(/saved lists/i, [zip]);
    await expectStatus("1 saved list(s): 2 new places");
  });

  it("ignores empty file selections", () => {
    renderWithStore(<ImportPage />);
    upload(/Timeline JSON/, []);
    upload(/saved lists/i, []);
    upload(/Restore backup/, []);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("stringifies non-Error failures", async () => {
    (parseTimelineFile as jest.Mock).mockRejectedValue("plain");
    renderWithStore(<ImportPage />);
    upload(/Timeline JSON/, [file("x.json", "")]);
    await expectStatus("plain");
  });
});
