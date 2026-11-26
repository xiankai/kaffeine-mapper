import { act, fireEvent, screen, within } from "@testing-library/react";
import { Place } from "../../domain/types";
import { place, visit } from "../../test/fixtures";
import { renderWithStore } from "../../test/render";
import { ExplorePage } from "../ExplorePage";

jest.mock("../MapPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}));

type Locate = Geolocation["getCurrentPosition"];
type Success = Parameters<Locate>[0];
type Failure = NonNullable<Parameters<Locate>[1]>;
const getCurrentPosition = jest.fn<void, Parameters<Locate>>();

const HERE = { lat: 35.66, lng: 139.7 };
const north = (id: string, metres: number, extra = {}) =>
  place({
    id,
    name: id,
    lat: HERE.lat + metres / 111_320,
    lng: HERE.lng,
    review: "cafe",
    ...extra,
  });

const places = [
  north("Far", 600, { visits: [visit("2026-11-20T01:00:00.000Z")] }),
  north("Kiln", 30),
  north("Blue Door", 80),
];

const answerWith = (lat: number, lng: number) =>
  getCurrentPosition.mockImplementation((ok: Success) =>
    ok({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition),
  );

const show = async (options: { places: Place[] }) => {
  const rendered = renderWithStore(<ExplorePage />, options);
  await screen.findByTestId("map");
  return rendered;
};

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

const setClock = (date: Date) =>
  jest.useFakeTimers({
    now: date,
    doNotFake: [
      "nextTick",
      "setImmediate",
      "queueMicrotask",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
    ],
  });

beforeEach(() => {
  localStorage.clear();
  getCurrentPosition.mockReset();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  setClock(new Date(2026, 10, 26, 14, 5));
});

afterEach(() => jest.useRealTimers());

describe("Explore check-in", () => {
  it("shows how far the Timeline reaches and the check-ins since", async () => {
    await show({ places });
    expect(
      screen.getByText("Timeline up to 2026-11-20 · 0 check-ins since"),
    ).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("suggests the nearest places, logs the pick and saves an evaluation", async () => {
    answerWith(HERE.lat, HERE.lng);
    await show({ places });
    click(/I'm here/);
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true }),
    );
    const suggestions = within(
      screen.getByRole("group", { name: "Where are you?" }),
    ).getAllByRole("button");
    expect(suggestions.map((b) => b.textContent)).toEqual([
      "Kiln (30 m)",
      "Blue Door (80 m)",
    ]);
    fireEvent.click(suggestions[0]!);
    expect(
      screen.getByText("Checked in at Kiln at 14:05."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Timeline up to 2026-11-20 · 1 check-in since"),
    ).toBeInTheDocument();

    const sheet = screen.getByRole("dialog", { name: "How is Kiln?" });
    const pick = (group: string, option: string) =>
      fireEvent.click(
        within(within(sheet).getByRole("group", { name: group })).getByRole(
          "button",
          { name: option },
        ),
      );
    pick("Power sockets", "many");
    pick("Wi-Fi", "weak");
    pick("Wi-Fi", "strong");
    pick("Wi-Fi time limit", "1 h");
    pick("Getting a seat (weekday afternoon)", "easy");
    pick("Rating", "4");
    pick("Rating", "4");
    fireEvent.change(within(sheet).getByRole("textbox"), {
      target: { value: "Quiet upstairs" },
    });
    click("Save");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/Checked in at Kiln/)).toBeInTheDocument();
  });

  it("says when nothing known is nearby", async () => {
    answerWith(HERE.lat + 1, HERE.lng);
    await show({ places });
    click(/I'm here/);
    expect(
      screen.getByText(/No known place within 150 m\. Adding a new place/),
    ).toBeInTheDocument();
  });

  it("waits for a fix, then falls back with a message when denied", async () => {
    await show({ places });
    click(/I'm here/);
    expect(screen.getByText("Finding you…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /I'm here/ })).toBeDisabled();
    const fail = getCurrentPosition.mock.calls[0]?.[1] as Failure;
    act(() => fail({ code: 1 } as GeolocationPositionError));
    expect(screen.queryByText("Finding you…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /I'm here/ })).toBeEnabled();
  });

  it("explains the fallback when location is denied or missing", async () => {
    getCurrentPosition.mockImplementation(
      (_ok: Success, fail?: Failure | null) =>
        fail?.({ code: 1 } as GeolocationPositionError),
    );
    const { unmount } = await show({ places });
    click(/I'm here/);
    expect(
      screen.getByText(/Couldn't get your location\. Open the place/),
    ).toBeInTheDocument();
    unmount();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
    await show({ places });
    click(/I'm here/);
    expect(screen.getByText(/Couldn't get your location/)).toBeInTheDocument();
  });

  it("skips the sheet, and leaves out seats late at night", async () => {
    setClock(new Date(2026, 10, 26, 23, 30));
    answerWith(HERE.lat, HERE.lng);
    await show({
      places: [north("Kiln", 10, { name: undefined })],
    });
    expect(
      screen.getByText("No Timeline import yet · 0 check-ins"),
    ).toBeInTheDocument();
    click(/I'm here/);
    click("Unnamed place (10 m)");
    expect(
      screen.queryByRole("group", { name: /Getting a seat/ }),
    ).not.toBeInTheDocument();
    click("Skip");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByText("No Timeline import yet · 1 check-in"),
    ).toBeInTheDocument();
  });
});
