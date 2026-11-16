import { TimelineResult } from "../domain/timeline";

type WorkerReply =
  | { ok: true; result: TimelineResult }
  | { ok: false; error: string };

export function parseTimelineFile(file: File): Promise<TimelineResult> {
  const worker = new Worker(new URL("./timelineWorker.ts", import.meta.url), {
    type: "module",
  });
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };
    worker.postMessage(file);
  });
}
