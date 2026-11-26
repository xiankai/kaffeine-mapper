import { AREA_RADIUS_M, AreaMode } from "../domain/area";
import { LocateStatus } from "../hooks/useArea";

const LABELS: Record<AreaMode, string> = {
  recent: "Recent area",
  near: "📍 Near me",
  everywhere: "Everywhere",
};

const MODES = Object.keys(LABELS) as AreaMode[];

function statusText(mode: AreaMode, status: LocateStatus): string {
  if (mode !== "near") return "";
  if (status === "locating") return "Finding you…";
  if (status === "unavailable")
    return "Couldn't get your location, so this shows your recent area.";
  return "";
}

export function AreaPicker({
  mode,
  status,
  onChange,
}: {
  mode: AreaMode;
  status: LocateStatus;
  onChange: (mode: AreaMode) => void;
}) {
  const note = statusText(mode, status);
  return (
    <fieldset className="chips area-picker">
      <legend className="sr-only">Area</legend>
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
        >
          {LABELS[m]}
        </button>
      ))}
      <span className="area-note" role="status">
        {note ||
          (mode === "everywhere" ? "" : `Within ${AREA_RADIUS_M / 1000} km`)}
      </span>
    </fieldset>
  );
}
