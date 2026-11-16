import { parseTimeline } from "../domain/timeline";

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const json: unknown = JSON.parse(await event.data.text());
    self.postMessage({ ok: true, result: parseTimeline(json) });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
