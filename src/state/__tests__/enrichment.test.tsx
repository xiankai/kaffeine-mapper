import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { place } from "../../test/fixtures";
import { EnrichmentStatus } from "../../components/EnrichmentStatus";
import { DEFAULT_PREFERENCES } from "../../domain/scoring";
import { Place } from "../../domain/types";
import { enrichPlaces, MATCHER_VERSION } from "../../services/overpass";
import { EnrichmentProvider, isExpired, useEnrichment } from "../enrichment";
import { StoreProvider, useStore } from "../store";

jest.mock("../../services/storage", () => ({
  ...jest.requireActual("../../services/storage"),
  saveDataset: jest.fn(async () => undefined),
}));
jest.mock("../../services/overpass", () => ({
  ...jest.requireActual("../../services/overpass"),
  enrichPlaces: jest.fn(),
}));

const NOW = new Date();
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 86400000).toISOString();
const checked = (id: string, days: number, extra: Partial<Place> = {}) =>
  place({
    id,
    osmCheckedAt: daysAgo(days),
    osmMatcher: MATCHER_VERSION,
    ...extra,
  });

let enrichment: ReturnType<typeof useEnrichment> | undefined;
let checkedAt: (id: string) => string | undefined = () => undefined;
let current: (id: string) => Place | undefined = () => undefined;
let edit: ReturnType<typeof useStore>["editPlace"] = () => undefined;

function Probe() {
  const live = useEnrichment();
  const { dataset, editPlace } = useStore();
  useEffect(() => {
    enrichment = live;
    edit = editPlace;
    current = (id) => dataset.places.find((p) => p.id === id);
    checkedAt = (id) => dataset.places.find((p) => p.id === id)?.osmCheckedAt;
  });
  return <EnrichmentStatus />;
}

function mount(places: Place[], refreshOnOpen?: boolean) {
  return render(
    <StoreProvider
      initial={{
        dataset: { version: 1, places },
        preferences: DEFAULT_PREFERENCES,
      }}
    >
      <EnrichmentProvider
        {...(refreshOnOpen !== undefined && { refreshOnOpen })}
      >
        <Probe />
      </EnrichmentProvider>
    </StoreProvider>,
  );
}

const echoBatches = () =>
  (enrichPlaces as jest.Mock).mockImplementation(
    async (places: Place[], { onBatch }) => {
      const fresh = places.map((p) => ({
        ...p,
        osmCheckedAt: NOW.toISOString(),
      }));
      onBatch(fresh, fresh.length, places.length);
      return fresh;
    },
  );

beforeEach(() => {
  (enrichPlaces as jest.Mock).mockReset();
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
  });
});

describe("isExpired", () => {
  it("is true only for checked, located, non-rejected places over 30 days old", () => {
    expect(isExpired(checked("a", 31), NOW)).toBe(true);
    expect(isExpired(checked("a", 29), NOW)).toBe(false);
    expect(isExpired(place(), NOW)).toBe(false);
    expect(isExpired(checked("a", 31, { located: false }), NOW)).toBe(false);
    expect(isExpired(checked("a", 31, { review: "not-cafe" }), NOW)).toBe(
      false,
    );
  });
});

describe("EnrichmentProvider", () => {
  it("refreshes places older than 30 days once on open", async () => {
    echoBatches();
    const view = mount([
      checked("old", 45),
      checked("new", 3),
      place({ id: "never" }),
    ]);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Refreshed 1 places from OpenStreetMap.",
      ),
    );
    expect(enrichPlaces).toHaveBeenCalledTimes(1);
    expect(
      (enrichPlaces as jest.Mock).mock.calls[0][0].map((p: Place) => p.id),
    ).toEqual(["old"]);
    expect(checkedAt("old")).toBe(NOW.toISOString());
    view.rerender(<p />);
    expect(enrichPlaces).toHaveBeenCalledTimes(1);
  });

  it("does nothing on open when offline, disabled or nothing is stale", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    mount([checked("old", 45)]).unmount();
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    mount([checked("old", 45)], false).unmount();
    mount([checked("new", 2)]);
    expect(enrichPlaces).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("won't start a second run while one is going, and reports errors", async () => {
    let fail: (error: unknown) => void = () => undefined;
    (enrichPlaces as jest.Mock).mockImplementation(
      () => new Promise((_, reject) => (fail = reject)),
    );
    mount([place({ id: "a" })], false);
    act(() => enrichment?.enrich([place({ id: "a" })]));
    act(() => enrichment?.enrich([place({ id: "a" })]));
    expect(enrichPlaces).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    await act(async () => fail("network down"));
    expect(screen.getByRole("status")).toHaveTextContent("network down");
    expect(
      screen.queryByRole("button", { name: "Stop" }),
    ).not.toBeInTheDocument();
  });

  it("keeps edits made while a batch was in flight", async () => {
    let deliver: () => void = () => undefined;
    (enrichPlaces as jest.Mock).mockImplementation(
      (places: Place[], { onBatch }) =>
        new Promise<void>((resolve) => {
          deliver = () => {
            onBatch(
              places.map((p) => ({
                ...p,
                osm: { id: "node/9", distanceM: 3, tags: {} },
                osmCheckedAt: NOW.toISOString(),
                osmMatcher: MATCHER_VERSION,
              })),
              1,
              1,
            );
            resolve();
          };
        }),
    );
    mount([place({ id: "a" })], false);
    act(() => enrichment?.enrich([place({ id: "a" })]));
    act(() => edit("a", (p) => ({ ...p, manual: { rating: 5 } })));
    await act(async () => deliver());
    expect(current("a")).toMatchObject({
      manual: { rating: 5 },
      osm: { id: "node/9" },
      osmCheckedAt: NOW.toISOString(),
      osmMatcher: MATCHER_VERSION,
    });
  });

  it("ignores an empty request", () => {
    mount([], false);
    act(() => enrichment?.enrich([]));
    expect(enrichPlaces).not.toHaveBeenCalled();
  });

  it("must sit inside its provider", () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(
      "useEnrichment must be used inside EnrichmentProvider",
    );
  });
});
