import { get, set } from "idb-keyval";

const API = "https://www.wikidata.org/w/api.php";
const ICON_PROPERTY = "P8972";
const WEBSITE_PROPERTY = "P856";
const LOGO_PROPERTY = "P154";
const DRAWN_LOGO = /\.(svg|png)$/i;

export const logoKey = (qid: string) => `kaffeine:logo3:${qid}`;

export const commonsThumb = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=64`;

// stack-reviewer-ignore: deliberate; Google's favicon service sees only the chain's public web domain (the app already sends Google place IDs), and the README and Import page disclose it
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

const SITE_ROOT = /^\/([a-z]{2}(-[a-z]{2})?\/?)?$/i;

function claimValues(claims: Claim[] = []): string[] {
  const usable = claims.filter((c) => c.rank !== "deprecated");
  const ordered = [
    ...usable.filter((c) => c.rank === "preferred"),
    ...usable.filter((c) => c.rank !== "preferred"),
  ];
  return ordered
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v): v is string => typeof v === "string");
}

const claimValue = (claims?: Claim[]) => claimValues(claims)[0];

function ownSiteFavicon(website: string): string | undefined {
  try {
    return SITE_ROOT.test(new URL(website).pathname)
      ? faviconUrl(website)
      : undefined;
  } catch {
    return undefined;
  }
}

function markerImage(claims: Record<string, Claim[]>): string | null {
  const icon = claimValue(claims[ICON_PROPERTY]);
  if (icon) return commonsThumb(icon);
  const favicon = claimValues(claims[WEBSITE_PROPERTY])
    .map(ownSiteFavicon)
    .find(Boolean);
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
