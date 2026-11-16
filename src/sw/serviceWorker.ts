import {
  APP_CACHE_PREFIX,
  isAppRequest,
  isShareTarget,
  precacheShell,
  receiveShare,
  respond,
  staleCaches,
} from "./handlers";

declare const __SW_VERSION__: string;
declare const __SW_PRECACHE__: string[];

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

interface WorkerScope {
  registration: { scope: string };
  clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(
    type: "install" | "activate",
    listener: (event: ExtendableEvent) => void,
  ): void;
  addEventListener(type: "fetch", listener: (event: FetchEvent) => void): void;
}

const worker = self as unknown as WorkerScope;
const scope = worker.registration.scope;
const APP_CACHE = `${APP_CACHE_PREFIX}${__SW_VERSION__}`;

worker.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => precacheShell(cache, scope, fetch, __SW_PRECACHE__))
      .then(() => worker.skipWaiting()),
  );
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(staleCaches(names, APP_CACHE).map((n) => caches.delete(n))),
      )
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener("fetch", (event) => {
  const { request } = event;
  if (isShareTarget(request, scope)) {
    event.respondWith(receiveShare(request, caches, scope));
    return;
  }
  if (!isAppRequest(request, scope)) return;
  event.respondWith(
    caches
      .open(APP_CACHE)
      .then((cache) => respond(request, cache, scope, fetch)),
  );
});
