import { useId } from "react";
import { ConfirmKey } from "../domain/evaluations";
import {
  ManualAttributes,
  SEAT_LEVELS,
  SeatLevel,
  SLOTS,
  Slot,
  SOCKET_LEVELS,
  SocketLevel,
  WIFI_LEVELS,
  WifiLevel,
} from "../domain/types";
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

interface Props {
  manual: ManualAttributes;
  onChange: (manual: ManualAttributes) => void;
  confirmed?: Partial<Record<ConfirmKey, string>>;
  fromChain?: ManualAttributes | undefined;
  chainDefaults?: boolean;
}

function withField<K extends keyof ManualAttributes>(
  manual: ManualAttributes,
  key: K,
  value: ManualAttributes[K] | undefined,
): ManualAttributes {
  const { [key]: _old, ...rest } = manual;
  return value === undefined ? rest : { ...rest, [key]: value };
}

function Choice<T extends string>({
  label,
  value,
  options,
  labels,
  hint,
  inherited,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: readonly T[];
  labels?: Record<T, string>;
  hint?: string | undefined;
  inherited?: T | undefined;
  onChange: (v: T | undefined) => void;
}) {
  const hintId = useId();
  const labelOf = (o: T) => labels?.[o] ?? o;
  return (
    <div className="field">
      <label>
        {label}
        <select
          value={value ?? ""}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) =>
            onChange((e.target.value || undefined) as T | undefined)
          }
        >
          <option value="">
            {inherited ? `from chain: ${labelOf(inherited)}` : "unknown"}
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {labelOf(o)}
            </option>
          ))}
        </select>
      </label>
      {hint && (
        <small id={hintId} className="confirmed">
          confirmed {hint}
        </small>
      )}
    </div>
  );
}

function chainValue(chain: boolean | undefined) {
  if (chain === undefined) return undefined;
  return chain ? "chain" : "independent";
}

function ChainChoice({
  chain,
  onChange,
}: {
  chain: boolean | undefined;
  onChange: (chain: boolean | undefined) => void;
}) {
  return (
    <Choice<"chain" | "independent">
      label="Chain?"
      value={chainValue(chain)}
      options={["chain", "independent"]}
      onChange={(v) => onChange(v === undefined ? undefined : v === "chain")}
    />
  );
}

export function AttributeEditor({
  manual,
  onChange,
  confirmed = {},
  fromChain = {},
  chainDefaults = false,
}: Props) {
  const set = <K extends keyof ManualAttributes>(
    key: K,
    value: ManualAttributes[K] | undefined,
  ) => onChange(withField(manual, key, value));
  const setSeat = (slot: Slot, level: SeatLevel | undefined) => {
    const { [slot]: _old, ...rest } = manual.seats ?? {};
    const seats = level ? { ...rest, [slot]: level } : rest;
    set("seats", Object.keys(seats).length ? seats : undefined);
  };

  return (
    <form className="editor" onSubmit={(e) => e.preventDefault()}>
      <Choice<SocketLevel>
        label="Power sockets"
        value={manual.sockets}
        options={SOCKET_LEVELS}
        hint={confirmed.sockets}
        inherited={fromChain.sockets}
        onChange={(v) => set("sockets", v)}
      />
      <Choice<WifiLevel>
        label="Wi-Fi strength"
        value={manual.wifi}
        options={WIFI_LEVELS}
        hint={confirmed.wifi}
        inherited={fromChain.wifi}
        onChange={(v) => set("wifi", v)}
      />
      <Choice
        label="Wi-Fi time limit"
        value={limitValue(manual.wifiLimitMinutes)}
        options={WIFI_LIMITS}
        labels={WIFI_LIMIT_LABELS}
        hint={confirmed.wifiLimitMinutes}
        inherited={limitValue(fromChain.wifiLimitMinutes)}
        onChange={(v) => set("wifiLimitMinutes", parseLimit(v))}
      />
      {!chainDefaults && (
        <ChainChoice chain={manual.chain} onChange={(v) => set("chain", v)} />
      )}
      <Choice
        label="My rating"
        value={ratingValue(manual.rating)}
        options={RATINGS}
        hint={confirmed.rating}
        inherited={ratingValue(fromChain.rating)}
        onChange={(v) => set("rating", parseRating(v))}
      />
      <fieldset className="seats">
        <legend>Getting a seat</legend>
        {SLOTS.map((slot) => (
          <Choice<SeatLevel>
            key={slot}
            label={slotLabel(slot)}
            value={manual.seats?.[slot]}
            options={SEAT_LEVELS}
            hint={confirmed[slot]}
            inherited={fromChain.seats?.[slot]}
            onChange={(v) => setSeat(slot, v)}
          />
        ))}
      </fieldset>
      {!chainDefaults && (
        <label className="notes">
          Notes
          <textarea
            value={manual.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || undefined)}
            rows={3}
          />
        </label>
      )}
    </form>
  );
}
