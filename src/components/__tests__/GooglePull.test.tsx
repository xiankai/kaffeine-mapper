import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "../../test/render";
import { DownloadBlockedError } from "../../dataPortability";
import { pullSavedPlaces } from "../../services/googleExport";
import { GooglePull } from "../GooglePull";
import { ImportPage } from "../ImportPage";

jest.mock("../../config", () => ({ GOOGLE_CLIENT_ID: "client-1" }));
jest.mock("../../services/parseTimelineFile", () => ({
  parseTimelineFile: jest.fn(),
}));
jest.mock("../../services/storage", () => ({
  ...jest.requireActual("../../services/storage"),
  saveDataset: jest.fn(async () => undefined),
}));
jest.mock("../../services/shareInbox", () => ({
  takeShared: jest.fn(async () => ({ files: [], links: [] })),
}));
jest.mock("../../services/googleExport", () => ({
  ...jest.requireActual("../../services/googleExport"),
  pullSavedPlaces: jest.fn(),
}));

const TOKEN = {
  accessToken: "tok",
  expiresAt: Date.now() + 3600000,
  resources: ["saved.collections"],
};
const signedIn = () =>
  sessionStorage.setItem("kaffeine:google-token", JSON.stringify(TOKEN));
const expectStatus = (text: string | RegExp) =>
  waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(text));
const pullButton = () =>
  screen.getByRole("button", { name: "Pull saved places from Google" });

beforeEach(() => {
  sessionStorage.clear();
  (pullSavedPlaces as jest.Mock).mockReset();
});

describe("GooglePull", () => {
  it("renders nothing without a client ID", () => {
    renderWithStore(
      <GooglePull
        clientId=""
        busy={false}
        onPull={jest.fn()}
        onSignInError={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sends a signed-out user to Google with this page as the redirect", () => {
    const redirect = jest.fn();
    renderWithStore(
      <GooglePull
        clientId="client-1"
        busy={false}
        onPull={jest.fn()}
        onSignInError={jest.fn()}
        redirect={redirect}
      />,
    );
    fireEvent.click(pullButton());
    const url = new URL(redirect.mock.calls[0][0]);
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("redirect_uri")).toBe(
      `${location.origin}${location.pathname}`,
    );
    expect(sessionStorage.getItem("kaffeine:google-pending")).toBe("1");
  });

  it("redirects through the browser by default", () => {
    const assign = jest.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      value: { ...original, assign, origin: original.origin, pathname: "/" },
      configurable: true,
    });
    renderWithStore(
      <GooglePull
        clientId="client-1"
        busy={false}
        onPull={jest.fn()}
        onSignInError={jest.fn()}
      />,
    );
    fireEvent.click(pullButton());
    expect(assign).toHaveBeenCalledWith(
      expect.stringContaining("accounts.google.com"),
    );
    Object.defineProperty(window, "location", {
      value: original,
      configurable: true,
    });
  });
});

describe("Import page Google pull", () => {
  it("pulls with a live token and imports the places", async () => {
    signedIn();
    (pullSavedPlaces as jest.Mock).mockImplementation(
      async (_token, { onStatus }) => {
        onStatus("Downloading 1 archive(s)…");
        return {
          places: [
            {
              id: "b:x",
              name: "Kiln",
              lat: 1,
              lng: 2,
              located: true,
              sources: ["saved"],
              lists: ["Want to go"],
              visits: [],
              review: "pending",
              manual: {},
            },
          ],
          lists: ["Want to go"],
        };
      },
    );
    renderWithStore(<ImportPage />);
    fireEvent.click(pullButton());
    await expectStatus(
      "Google saved places: 1 new places, 0 updated, 0 new visits.",
    );
    expect(pullSavedPlaces).toHaveBeenCalledWith(TOKEN, expect.anything());
  });

  it("resumes the pull after returning from sign-in", async () => {
    signedIn();
    sessionStorage.setItem("kaffeine:google-pending", "1");
    (pullSavedPlaces as jest.Mock).mockResolvedValue({ places: [], lists: [] });
    renderWithStore(<ImportPage />);
    await expectStatus("Google saved places: 0 new places");
  });

  it("shows a sign-in error from the redirect", async () => {
    sessionStorage.setItem("kaffeine:google-error", "Google sign-in failed: x");
    renderWithStore(<ImportPage />);
    await expectStatus("Google sign-in failed: x");
  });

  it("explains the region limit when Google denies access", async () => {
    sessionStorage.setItem(
      "kaffeine:google-error",
      "Google sign-in failed: access_denied",
    );
    renderWithStore(<ImportPage />);
    await expectStatus(/access_denied\. Google only offers this .*Takeout zip/);
  });

  it("labels the pull as Europe only", () => {
    renderWithStore(<ImportPage />);
    expect(screen.getByText("Europe only.")).toBeInTheDocument();
  });

  it("offers the archive links when the browser can't download them", async () => {
    signedIn();
    (pullSavedPlaces as jest.Mock).mockRejectedValue(
      new DownloadBlockedError(["https://dl.test/a.zip"]),
    );
    renderWithStore(<ImportPage />);
    fireEvent.click(pullButton());
    await expectStatus(/blocked by CORS/);
    expect(
      screen.getByRole("link", { name: "Google export archive 1" }),
    ).toHaveAttribute("href", "https://dl.test/a.zip");
  });
});
