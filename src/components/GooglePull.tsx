import { useEffect, useState } from "react";
import { AccessToken } from "../dataPortability";
import {
  currentToken,
  signInUrl,
  takePendingPull,
} from "../services/googleExport";

export interface GooglePullProps {
  clientId: string;
  busy: boolean;
  onPull: (token: AccessToken) => void;
  onSignInError: (error: string) => void;
  redirect?: (url: string) => void;
}

const appUrl = () => `${location.origin}${location.pathname}`;

const REGION_LIMIT =
  "Google only offers this to personal accounts in the EEA, the UK and Switzerland.";

const explain = (error: string) =>
  error.endsWith("access_denied")
    ? `${error}. ${REGION_LIMIT} Import the Takeout zip instead.`
    : error;

export function GooglePull({
  clientId,
  busy,
  onPull,
  onSignInError,
  redirect = (url) => location.assign(url),
}: GooglePullProps) {
  const [handlers] = useState(() => ({ onPull, onSignInError }));

  useEffect(() => {
    const { pending, error } = takePendingPull();
    const token = currentToken();
    if (error) handlers.onSignInError(explain(error));
    else if (pending && token) handlers.onPull(token);
  }, [handlers]);

  if (!clientId) return null;
  const pull = () => {
    const token = currentToken();
    if (token) onPull(token);
    else redirect(signInUrl(clientId, appUrl()));
  };
  return (
    <div className="google-pull">
      <button type="button" onClick={pull} disabled={busy}>
        Pull saved places from Google
      </button>
      <p className="muted">
        <strong>Europe only.</strong> {REGION_LIMIT}
      </p>
    </div>
  );
}
