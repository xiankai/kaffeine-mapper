import { get, set } from "idb-keyval";

const API = "https://www.wikidata.org/w/api.php";
const LOGO_PROPERTY = "P154";

export const logoKey = (qid: string) => `kaffeine:logo:${qid}`;

export const commonsThumb = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=64`;

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

function logoClaim(claims: Claim[]): string | null {
  const usable = claims.filter((c) => c.rank !== "deprecated");
  const chosen = usable.find((c) => c.rank === "preferred") ?? usable[0];
  const file = chosen?.mainsnak?.datavalue?.value;
  return typeof file === "string" ? commonsThumb(file) : null;
}

export function logoFromResponse(body: EntitiesResponse): string | null {
  if (body.error?.code === "no-such-entity") return null;
  if (body.error || !body.entities)
    throw new Error("Unexpected Wikidata reply");
  const entity = Object.values(body.entities)[0];
  if (!entity || entity.missing !== undefined) return null;
  return logoClaim(entity.claims?.[LOGO_PROPERTY] ?? []);
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

const pending = new Map<string, Promise<string | null | undefined>>();

export function loadLogo(qid: string): Promise<string | null | undefined> {
  const known = pending.get(qid);
  if (known) return known;
  const request = resolveLogo(qid).then((logo) => {
    if (logo === undefined) pending.delete(qid);
    return logo;
  });
  pending.set(qid, request);
  return request;
}
