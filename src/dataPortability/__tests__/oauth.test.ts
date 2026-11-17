import { authUrl, isAuthResponse, readAuthResponse, scopeFor } from "../oauth";

describe("authUrl", () => {
  it("asks for a token for each resource scope, never granted-scope merging", () => {
    const url = new URL(
      authUrl({
        clientId: "client-1",
        redirectUri: "https://example.test/app/",
        resources: ["saved.collections", "maps.starred_places"],
        state: "s1",
        loginHint: "someone",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "client-1",
      redirect_uri: "https://example.test/app/",
      response_type: "token",
      scope: `${scopeFor("saved.collections")} ${scopeFor("maps.starred_places")}`,
      state: "s1",
      login_hint: "someone",
    });
  });

  it("leaves out an absent login hint", () => {
    const url = new URL(
      authUrl({
        clientId: "c",
        redirectUri: "https://example.test/",
        resources: ["saved.collections"],
        state: "s",
      }),
    );
    expect(url.searchParams.has("login_hint")).toBe(false);
  });
});

describe("readAuthResponse", () => {
  const scope = encodeURIComponent(
    `${scopeFor("saved.collections")} https://www.googleapis.com/auth/userinfo.email`,
  );

  it("spots a sign-in redirect", () => {
    expect(isAuthResponse("#access_token=x&state=s")).toBe(true);
    expect(isAuthResponse("#state=s&error=access_denied")).toBe(true);
    expect(isAuthResponse("#/import")).toBe(false);
  });

  it("reads the token, its expiry and the granted resources", () => {
    expect(
      readAuthResponse(
        `#access_token=tok&expires_in=60&scope=${scope}&state=s1`,
        "s1",
        1000,
      ),
    ).toEqual({
      ok: true,
      token: {
        accessToken: "tok",
        expiresAt: 61000,
        resources: ["saved.collections"],
      },
    });
  });

  it("defaults to an hour and no resources when Google omits them", () => {
    expect(readAuthResponse("#access_token=tok&state=s", "s", 0)).toEqual({
      ok: true,
      token: { accessToken: "tok", expiresAt: 3600000, resources: [] },
    });
  });

  it("rejects a mismatched state, an error and a missing token", () => {
    expect(readAuthResponse("#access_token=t&state=x", "s")).toMatchObject({
      ok: false,
      error: "Sign-in response didn't match this request.",
    });
    expect(readAuthResponse("#access_token=t&state=x", undefined).ok).toBe(
      false,
    );
    expect(readAuthResponse("#error=access_denied&state=s", "s")).toEqual({
      ok: false,
      error: "Google sign-in failed: access_denied",
    });
    expect(readAuthResponse("#state=s", "s")).toEqual({
      ok: false,
      error: "Google sign-in returned no token.",
    });
  });
});
