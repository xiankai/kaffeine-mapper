import { ReactNode } from "react";
import {
  Filters,
  ReviewFilter,
  SortKey,
  StatusFilter,
} from "../domain/filters";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Toggle = "sockets" | "wifi" | "weekend" | "independent" | "groupChains";

const TOGGLES: Array<[Toggle, string]> = [
  ["sockets", "🔌 Sockets"],
  ["wifi", "📶 Wi-Fi"],
  ["weekend", "Open weekends"],
  ["independent", "Independent"],
  ["groupChains", "Group chains"],
];

interface Props {
  filters: Filters;
  count: number;
  onChange: (filters: Filters) => void;
  now?: () => Date;
}

type OpenAt = NonNullable<Filters["openAt"]>;

function toTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function fromTime(value: string): number {
  const [h = "0", m = "0"] = value.split(":");
  return Number(h) * 60 + Number(m);
}

function Select<T extends string>({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  children: ReactNode;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {children}
      </select>
    </label>
  );
}

function OpenAtPicker({
  openAt,
  onChange,
}: {
  openAt: OpenAt;
  onChange: (openAt: OpenAt) => void;
}) {
  return (
    <fieldset className="open-at">
      <legend className="sr-only">Open at</legend>
      <select
        aria-label="Day"
        value={openAt.day}
        onChange={(e) => onChange({ ...openAt, day: Number(e.target.value) })}
      >
        {DAYS.map((d, i) => (
          <option key={d} value={i}>
            {d}
          </option>
        ))}
      </select>
      <input
        type="time"
        aria-label="Time"
        value={toTime(openAt.minute)}
        onChange={(e) =>
          onChange({ ...openAt, minute: fromTime(e.target.value) })
        }
      />
    </fieldset>
  );
}

function ShortVisitsOption({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="short-visits">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      Include short one-off visits
    </label>
  );
}

function withoutOpenAt(filters: Filters): Filters {
  const { openAt: _openAt, ...rest } = filters;
  return rest;
}

function openAtNow(now: Date): OpenAt {
  return { day: now.getDay(), minute: now.getHours() * 60 + now.getMinutes() };
}

export function FilterBar({
  filters,
  count,
  onChange,
  now = () => new Date(),
}: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const { openAt } = filters;
  const toggleOpenAt = () =>
    onChange(
      openAt
        ? withoutOpenAt(filters)
        : { ...filters, openAt: openAtNow(now()) },
    );

  return (
    <form
      className="filters"
      aria-label="Filters"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="search"
        aria-label="Search"
        placeholder="Search name, address, list"
        value={filters.query}
        onChange={(e) => set({ query: e.target.value })}
      />
      <Select<StatusFilter>
        label="Show"
        value={filters.status}
        onChange={(status) => set({ status })}
      >
        <option value="all">Visited + saved</option>
        <option value="visited">Visited</option>
        <option value="bookmarked">Saved</option>
        <option value="to-try">Saved, not visited</option>
      </Select>
      <Select<ReviewFilter>
        label="Places"
        value={filters.review}
        onChange={(review) =>
          set({ review, ...(review === "pending" && { sort: "visits" }) })
        }
      >
        <option value="likely">Cafés</option>
        <option value="pending">Needs review</option>
        <option value="all">Everything</option>
      </Select>
      <Select<SortKey>
        label="Sort"
        value={filters.sort}
        onChange={(sort) => set({ sort })}
      >
        <option value="score">Score</option>
        <option value="visits">Most visited</option>
        <option value="recent">Recently visited</option>
        <option value="name">Name</option>
      </Select>
      <fieldset className="chips">
        <legend className="sr-only">Requirements</legend>
        {TOGGLES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filters[key]}
            onClick={() => set({ [key]: !filters[key] })}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={openAt !== undefined}
          onClick={toggleOpenAt}
        >
          🕒 Open at…
        </button>
      </fieldset>
      {filters.review === "pending" && (
        <ShortVisitsOption
          checked={filters.shortVisits}
          onChange={(shortVisits) => set({ shortVisits })}
        />
      )}
      {openAt && (
        <OpenAtPicker
          openAt={openAt}
          onChange={(next) => set({ openAt: next })}
        />
      )}
      <output aria-live="polite">{count} places</output>
    </form>
  );
}
