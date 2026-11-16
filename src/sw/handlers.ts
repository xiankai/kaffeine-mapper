import { stashShare } from "../services/shareInbox";

export const APP_CACHE_PREFIX = "kaffeine-app-";
export const SHARE_ACTION = "share-target";
export const SHARE_LANDING = "#/import";

type Fetch = typeof fetch;
type AppCache = Pick<Cache, "match" | "put" | "addAll">;

const LOCAL_REF = /(?:src|href)="([^"#:]+)"/g;

export function shellAssets(html: string): string[] {
  return [...new Set([...html.matchAll(LOCAL_REF)].map((m) => m[1] ?? ""))]
    .filter((ref) => ref && !ref.startsWith("//"))
    .sort();
}

export async function precacheShell(
  cache: AppCache,
  scope: string,
  fetchImpl: Fetch,
  bundled: string[] = [],
): Promise<void> {
  const response = await fetchImpl(scope, { cache: "reload" });
  if (!response.ok) throw new Error(`App shell returned ${response.status}`);
  const html = await response.clone().text();
  await cache.put(scope, response);
  const urls = new Set(
    [...shellAssets(html), ...bundled].map((ref) => new URL(ref, scope).href),
  );
  await cache.addAll([...urls]);
}

export function isShareTarget(request: Request, scope: string): boolean {
  return (
    request.method === "POST" &&
    new URL(request.url).href === new URL(SHARE_ACTION, scope).href
  );
}

export function isAppRequest(request: Request, scope: string): boolean {
  return request.method === "GET" && request.url.startsWith(scope);
}

export async function receiveShare(
  request: Request,
  inbox: Pick<CacheStorage, "open">,
  scope: string,
): Promise<Response> {
  await stashShare(await request.formData(), inbox, scope);
  return Response.redirect(new URL(SHARE_LANDING, scope).href, 303);
}

async function networkFirst(
  request: Request,
  cache: AppCache,
  scope: string,
  fetchImpl: Fetch,
): Promise<Response> {
  try {
    const response = await fetchImpl(request);
    if (response.ok) await cache.put(scope, response.clone());
    return response;
  } catch {
    return (await cache.match(scope)) ?? Response.error();
  }
}

async function cacheFirst(
  request: Request,
  cache: AppCache,
  fetchImpl: Fetch,
): Promise<Response> {
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetchImpl(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

export function respond(
  request: Request,
  cache: AppCache,
  scope: string,
  fetchImpl: Fetch,
): Promise<Response> {
  return request.mode === "navigate"
    ? networkFirst(request, cache, scope, fetchImpl)
    : cacheFirst(request, cache, fetchImpl);
}

export function staleCaches(names: string[], current: string): string[] {
  return names.filter(
    (name) => name.startsWith(APP_CACHE_PREFIX) && name !== current,
  );
}
