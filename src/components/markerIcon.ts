import { MarkerSpec } from "../domain/markers";

export const BADGE_SIZE = 28;
export const DOT_SIZE = 12;

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ENTITIES[c] as string);

function content(spec: MarkerSpec): string {
  switch (spec.kind) {
    case "dot":
      return "";
    case "cafe":
      return "☕";
    case "initials":
      return escapeHtml(spec.initials);
    case "logo":
      return `${escapeHtml(spec.initials)}<img src="${escapeHtml(spec.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  }
}

export function markerClass(spec: MarkerSpec): string {
  const kind = `map-marker map-marker-${spec.kind}`;
  return spec.visited ? kind : `${kind} map-marker-saved`;
}

export function markerHtml(spec: MarkerSpec): string {
  return `<span class="${markerClass(spec)}" style="--ring:${escapeHtml(spec.ring)}">${content(spec)}</span>`;
}

export function hideBrokenLogo(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLImageElement && target.closest(".map-marker-logo"))
    target.hidden = true;
}

export const markerSize = (spec: MarkerSpec): number =>
  spec.kind === "dot" ? DOT_SIZE : BADGE_SIZE;
