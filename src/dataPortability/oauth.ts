export const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const SCOPE_PREFIX = "https://www.googleapis.com/auth/dataportability.";

export interface AuthRequest {
  clientId: string;
  redirectUri: string;
  resources: string[];
  state: string;
  loginHint?: string;
}

export interface AccessToken {
  accessToken: string;
  expiresAt: number;
  resources: string[];
}

export type TokenResult =
  { ok: true; token: AccessToken } | { ok: false; error: string };

export const scopeFor = (resource: string) => `${SCOPE_PREFIX}${resource}`;

export function authUrl(request: AuthRequest): string {
  const params = new URLSearchParams({
    client_id: request.clientId,
    redirect_uri: request.redirectUri,
    response_type: "token",
    scope: request.resources.map(scopeFor).join(" "),
    state: request.state,
    ...(request.loginHint && { login_hint: request.loginHint }),
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

export function isAuthResponse(hash: string): boolean {
  return /(^#|&)(access_token|error)=/.test(hash);
}

function grantedResources(scope: string | null): string[] {
  return (scope ?? "")
    .split(/\s+/)
    .filter((s) => s.startsWith(SCOPE_PREFIX))
    .map((s) => s.slice(SCOPE_PREFIX.length));
}

export function readAuthResponse(
  hash: string,
  expectedState: string | undefined,
  now = Date.now(),
): TokenResult {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!expectedState || params.get("state") !== expectedState)
    return { ok: false, error: "Sign-in response didn't match this request." };
  const error = params.get("error");
  if (error) return { ok: false, error: `Google sign-in failed: ${error}` };
  const accessToken = params.get("access_token");
  if (!accessToken)
    return { ok: false, error: "Google sign-in returned no token." };
  const expiresIn = Number(params.get("expires_in") ?? "3600");
  return {
    ok: true,
    token: {
      accessToken,
      expiresAt: now + expiresIn * 1000,
      resources: grantedResources(params.get("scope")),
    },
  };
}
