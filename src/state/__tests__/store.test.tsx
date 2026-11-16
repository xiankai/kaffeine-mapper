import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { ReactNode } from "react";
import { osm, place, visit } from "../../test/fixtures";
import { DEFAULT_PREFERENCES } from "../../domain/scoring";
import {
  loadPersisted,
  saveDataset,
  savePreferences,
} from "../../services/storage";
import { replacePlaces, StoreProvider, useStore } from "../store";

jest.mock("../../services/storage", () => ({
  loadPersisted: jest.fn(),
  saveDataset: jest.fn(async () => undefined),
  savePreferences: jest.fn(async () => undefined),
}));

const initial = {
  dataset: {
    version: 1 as const,
    places: [place({ id: "g:a", visits: [visit("1")] })],
  },
  preferences: DEFAULT_PREFERENCES,
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <StoreProvider initial={initial}>{children}</StoreProvider>
);

describe("StoreProvider", () => {
  it("loads persisted state when no initial state is given", async () => {
    (loadPersisted as jest.Mock).mockResolvedValue(initial);
    function Probe() {
      const { ready, dataset } = useStore();
      return <p>{ready ? `ready ${dataset.places.length}` : "loading"}</p>;
    }
    render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("ready 1")).toBeInTheDocument(),
    );
  });

  it("imports, enriches, edits, replaces and saves", () => {
    const { result } = renderHook(() => useStore(), { wrapper });
    let summary;
    act(() => {
      summary = result.current.importPlaces([
        place({ id: "b:x", sources: ["saved"], lists: ["L"] }),
      ]);
    });
    expect(summary).toMatchObject({ added: 1 });
    act(() =>
      result.current.applyEnriched([
        place({ id: "b:x", lists: ["L"], osm: osm({}, "node/5") }),
        place({ id: "g:a", visits: [visit("1")], osm: osm({}, "node/5") }),
      ]),
    );
    expect(result.current.dataset.places).toHaveLength(1);
    expect(result.current.dataset.places[0]?.aliases).toEqual(["b:x"]);
    act(() =>
      result.current.editPlace("g:a", (p) => ({ ...p, review: "cafe" })),
    );
    expect(result.current.dataset.places[0]?.review).toBe("cafe");
    act(() => result.current.replaceDataset({ version: 1, places: [] }));
    expect(result.current.dataset.places).toEqual([]);
    expect(saveDataset).toHaveBeenCalledTimes(4);
    act(() =>
      result.current.setPreferences({
        ...DEFAULT_PREFERENCES,
        chain: "prefer",
      }),
    );
    expect(result.current.preferences.chain).toBe("prefer");
    expect(savePreferences).toHaveBeenCalled();
  });

  it("rejects use outside the provider", () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useStore())).toThrow(/StoreProvider/);
  });
});

describe("replacePlaces", () => {
  it("swaps matching places and leaves others", () => {
    const out = replacePlaces(
      { version: 1, places: [place({ id: "a" }), place({ id: "b" })] },
      [place({ id: "b", name: "B" })],
    );
    expect(out.places.map((p) => p.name)).toEqual([undefined, "B"]);
  });
});
