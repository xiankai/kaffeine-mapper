import {
  ManualAttributes,
  SeatLevel,
  SLOTS,
  Slot,
  SocketLevel,
  WifiLevel,
} from "../domain/types";

interface Props {
  manual: ManualAttributes;
  onChange: (manual: ManualAttributes) => void;
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
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: readonly T[];
  onChange: (v: T | undefined) => void;
}) {
  return (
    <label>
      {label}
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange((e.target.value || undefined) as T | undefined)
        }
      >
        <option value="">unknown</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

const SLOT_LABEL = (slot: Slot) => slot.replace("-", " ");

function limitValue(limit: number | null | undefined): string {
  if (limit === undefined) return "";
  return limit === null ? "none" : String(limit);
}

function parseLimit(value: string): number | null | undefined {
  if (value === "") return undefined;
  if (value === "none") return null;
  return Number(value);
}

export function AttributeEditor({ manual, onChange }: Props) {
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
        options={["none", "few", "many"]}
        onChange={(v) => set("sockets", v)}
      />
      <Choice<WifiLevel>
        label="Wi-Fi strength"
        value={manual.wifi}
        options={["none", "weak", "ok", "strong"]}
        onChange={(v) => set("wifi", v)}
      />
      <label>
        Wi-Fi time limit
        <select
          value={limitValue(manual.wifiLimitMinutes)}
          onChange={(e) => set("wifiLimitMinutes", parseLimit(e.target.value))}
        >
          <option value="">unknown</option>
          <option value="none">no limit</option>
          <option value="30">30 min</option>
          <option value="60">1 h</option>
          <option value="120">2 h</option>
          <option value="180">3 h</option>
        </select>
      </label>
      <Choice<"chain" | "independent">
        label="Chain?"
        value={
          manual.chain === undefined
            ? undefined
            : manual.chain
              ? "chain"
              : "independent"
        }
        options={["chain", "independent"]}
        onChange={(v) =>
          set("chain", v === undefined ? undefined : v === "chain")
        }
      />
      <Choice<"1" | "2" | "3" | "4" | "5">
        label="My rating"
        value={
          manual.rating === undefined
            ? undefined
            : (String(manual.rating) as "1")
        }
        options={["1", "2", "3", "4", "5"]}
        onChange={(v) => set("rating", v === undefined ? undefined : Number(v))}
      />
      <fieldset className="seats">
        <legend>Getting a seat</legend>
        {SLOTS.map((slot) => (
          <Choice<SeatLevel>
            key={slot}
            label={SLOT_LABEL(slot)}
            value={manual.seats?.[slot]}
            options={["easy", "ok", "hard"]}
            onChange={(v) => setSeat(slot, v)}
          />
        ))}
      </fieldset>
      <label className="notes">
        Notes
        <textarea
          value={manual.notes ?? ""}
          onChange={(e) => set("notes", e.target.value || undefined)}
          rows={3}
        />
      </label>
    </form>
  );
}
