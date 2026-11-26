import { get, set } from "idb-keyval";

const API = "https://www.wikidata.org/w/api.php";
const ICON_PROPERTY = "P8972";
const WEBSITE_PROPERTY = "P856";
const LOGO_PROPERTY = "P154";
const DRAWN_LOGO = /\.(svg|png)$/i;

export const logoKey = (qid: string) => `kaffeine:logo2:${qid}`;

export const commonsThumb = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=64`;

export const faviconUrl = (website: string) =>
  `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(new URL(website).hostname)}`;

interface Claim {
  rank?: string;
  mainsnak?: { datavalue?: { value?: unknown } };
}

interface Entity {
  missing?: string;
  claims?: Record<string, Claim[]>;
}

interface EntitiesResponse {
  error?: { code?: string };
  entities?: Record<string, Entity>;
}

function claimValue(claims: Claim[] = []): string | undefined {
  const usable = claims.filter((c) => c.rank !== "deprecated");
  const chosen = usable.find((c) => c.rank === "preferred") ?? usable[0];
  const value = chosen?.mainsnak?.datavalue?.value;
  return typeof value === "string" ? value : undefined;
}

function websiteFavicon(website: string | undefined): string | undefined {
  if (!website) return undefined;
  try {
    return faviconUrl(website);
  } catch {
    return undefined;
  }
}

function markerImage(claims: Record<string, Claim[]>): string | null {
  const icon = claimValue(claims[ICON_PROPERTY]);
  if (icon) return commonsThumb(icon);
  const favicon = websiteFavicon(claimValue(claims[WEBSITE_PROPERTY]));
  if (favicon) return favicon;
  const logo = claimValue(claims[LOGO_PROPERTY]);
  return logo && DRAWN_LOGO.test(logo) ? commonsThumb(logo) : null;
}

export function logoFromResponse(body: EntitiesResponse): string | null {
  if (body.error?.code === "no-such-entity") return null;
  if (body.error || !body.entities)
    throw new Error("Unexpected Wikidata reply");
  const entity = Object.values(body.entities)[0];
  if (!entity || entity.missing !== undefined) return null;
  return markerImage(entity.claims ?? {});
}

export function entityUrl(qid: string): string {
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qid,
    props: "claims",
    format: "json",
    origin: "*",
  });
  return `${API}?${params}`;
}

export async function fetchLogo(
  qid: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const response = await fetchImpl(entityUrl(qid));
  if (!response.ok) throw new Error(`Wikidata returned ${response.status}`);
  return logoFromResponse((await response.json()) as EntitiesResponse);
}

export interface LogoStore {
  load: (key: string) => Promise<string | null | undefined>;
  save: (key: string, value: string | null) => Promise<void>;
}

const idbStore: LogoStore = { load: get, save: set };

export async function resolveLogo(
  qid: string,
  fetchImpl: typeof fetch = fetch,
  store: LogoStore = idbStore,
): Promise<string | null | undefined> {
  const cached = await store.load(logoKey(qid)).catch(() => undefined);
  if (cached !== undefined) return cached;
  const logo = await fetchLogo(qid, fetchImpl).catch(() => undefined);
  if (logo !== undefined) await store.save(logoKey(qid), logo).catch(() => {});
  return logo;
}

const answered = new Map<string, Promise<string | null | undefined>>();

export function loadLogo(qid: string): Promise<string | null | undefined> {
  const known = answered.get(qid);
  if (known) return known;
  const request = resolveLogo(qid).then((logo) => {
    if (logo === undefined) answered.delete(qid);
    return logo;
  });
  // stack-reviewer-ignore: a session memo with one entry per brand Q-id shown on the map (tens of chains), kept so panning never re-reads IndexedDB or re-asks Wikidata; failures are dropped so they retry
  answered.set(qid, request);
  return request;
}
