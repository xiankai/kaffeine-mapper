import { useState } from "react";
import { displayName, slotOf } from "../domain/insights";
import {
  SEAT_LEVELS,
  SeatLevel,
  SOCKET_LEVELS,
  WIFI_LEVELS,
} from "../domain/types";
import { CheckedIn, CheckInFlow, EvaluationFields } from "../hooks/useCheckIn";
import {
  limitValue,
  parseLimit,
  parseRating,
  RATINGS,
  ratingValue,
  slotLabel,
  WIFI_LIMIT_LABELS,
  WIFI_LIMITS,
} from "./attributeOptions";

function Chips<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: readonly T[];
  labels?: Record<T, string>;
  onChange: (v: T | undefined) => void;
}) {
  return (
    <fieldset className="chips">
      <legend>{label}</legend>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(value === o ? undefined : o)}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </fieldset>
  );
}

function withValue<K extends keyof EvaluationFields>(
  fields: EvaluationFields,
  key: K,
  value: EvaluationFields[K] | undefined,
): EvaluationFields {
  const { [key]: _old, ...rest } = fields;
  return value === undefined ? rest : { ...rest, [key]: value };
}

const clock = (at: Date) =>
  `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;

export function EvaluationSheet({ checkedIn }: { checkedIn: CheckedIn }) {
  const { place, at, save, close } = checkedIn;
  const [fields, setFields] = useState<EvaluationFields>({});
  const slot = slotOf(at.getDay(), at.getHours() * 60 + at.getMinutes());
  const set = <K extends keyof EvaluationFields>(
    key: K,
    value: EvaluationFields[K] | undefined,
  ) => setFields(withValue(fields, key, value));
  const name = displayName(place);

  return (
    <section role="dialog" aria-label={`How is ${name}?`} className="sheet">
      <h2>How is it today?</h2>
      <Chips
        label="Power sockets"
        value={fields.sockets}
        options={SOCKET_LEVELS}
        onChange={(v) => set("sockets", v)}
      />
      <Chips
        label="Wi-Fi"
        value={fields.wifi}
        options={WIFI_LEVELS}
        onChange={(v) => set("wifi", v)}
      />
      <Chips
        label="Wi-Fi time limit"
        value={limitValue(fields.wifiLimitMinutes)}
        options={WIFI_LIMITS}
        labels={WIFI_LIMIT_LABELS}
        onChange={(v) => set("wifiLimitMinutes", parseLimit(v))}
      />
      {slot && (
        <Chips<SeatLevel>
          label={`Getting a seat (${slotLabel(slot)})`}
          value={fields.seats?.[slot]}
          options={SEAT_LEVELS}
          onChange={(v) => set("seats", v && { [slot]: v })}
        />
      )}
      <Chips
        label="Rating"
        value={ratingValue(fields.rating)}
        options={RATINGS}
        onChange={(v) => set("rating", parseRating(v))}
      />
      <label className="notes">
        Note from {clock(at)}
        <textarea
          rows={2}
          value={fields.note ?? ""}
          onChange={(e) => set("note", e.target.value || undefined)}
        />
      </label>
      <div className="sheet-actions">
        <button type="button" onClick={() => save(fields)}>
          Save
        </button>
        <button type="button" onClick={close}>
          Skip
        </button>
      </div>
    </section>
  );
}

export function CheckInOutcome({ flow }: { flow: CheckInFlow }) {
  const { current } = flow;
  if (!current) return null;
  return (
    <>
      <p role="status" className="status done">
        Checked in at {displayName(current.place)} at {clock(current.at)}.
      </p>
      {current.open && (
        <EvaluationSheet key={current.at.getTime()} checkedIn={current} />
      )}
    </>
  );
}
