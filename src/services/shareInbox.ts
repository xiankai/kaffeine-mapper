import { SharedLink } from "../domain/share";

export const INBOX_CACHE = "kaffeine-share-inbox";
const NAME_HEADER = "x-share-name";
const LINK_TYPE = "application/x-kaffeine-link";

export interface SharedItems {
  files: File[];
  links: SharedLink[];
}

type Inbox = Pick<CacheStorage, "open">;

function formText(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function linkFrom(form: FormData): SharedLink | undefined {
  const title = formText(form, "title");
  const text = formText(form, "text");
  const url = formText(form, "url");
  if (!title && !text && !url) return undefined;
  return {
    ...(title && { title }),
    ...(text && { text }),
    ...(url && { url }),
  };
}

function sharedFiles(form: FormData): File[] {
  return form
    .getAll("files")
    .filter((entry): entry is File => typeof entry !== "string");
}

export async function stashShare(
  form: FormData,
  inbox: Inbox,
  base: string,
  stamp = Date.now(),
): Promise<number> {
  const cache = await inbox.open(INBOX_CACHE);
  const key = (n: number) => new URL(`share-inbox/${stamp}-${n}`, base).href;
  const files = sharedFiles(form);
  await Promise.all(
    files.map((file, n) =>
      cache.put(
        key(n),
        new Response(file, {
          headers: {
            "content-type": file.type || "application/octet-stream",
            [NAME_HEADER]: encodeURIComponent(file.name),
          },
        }),
      ),
    ),
  );
  const link = linkFrom(form);
  if (link) {
    await cache.put(
      key(files.length),
      new Response(JSON.stringify(link), {
        headers: { "content-type": LINK_TYPE },
      }),
    );
  }
  return files.length + (link ? 1 : 0);
}

async function readEntry(
  response: Response,
  items: SharedItems,
): Promise<void> {
  const name = response.headers.get(NAME_HEADER);
  if (name !== null) {
    const blob = await response.blob();
    items.files.push(
      new File([blob], decodeURIComponent(name), { type: blob.type }),
    );
    return;
  }
  if (response.headers.get("content-type") === LINK_TYPE)
    items.links.push((await response.json()) as SharedLink);
}

export async function takeShared(
  inbox: Inbox | undefined = globalThis.caches,
): Promise<SharedItems> {
  const items: SharedItems = { files: [], links: [] };
  if (!inbox) return items;
  const cache = await inbox.open(INBOX_CACHE);
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    if (response) await readEntry(response, items).catch(() => undefined);
    await cache.delete(request);
  }
  return items;
}
