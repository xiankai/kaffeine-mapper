import {
  Filters,
  ReviewFilter,
  SortKey,
  StatusFilter,
} from "../domain/filters";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  filters: Filters;
  count: number;
  onChange: (filters: Filters) => void;
  now?: () => Date;
}

function toTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function fromTime(value: string): number {
  const [h = "0", m = "0"] = value.split(":");
  return Number(h) * 60 + Number(m);
}

export function FilterBar({
  filters,
  count,
  onChange,
  now = () => new Date(),
}: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const toggle = (key: "weekend" | "sockets" | "wifi" | "independent") =>
    set({ [key]: !filters[key] });
  const openNow = () => {
    const d = now();
    set({
      openAt: { day: d.getDay(), minute: d.getHours() * 60 + d.getMinutes() },
    });
  };
  const { openAt } = filters;
  const withoutOpenAt = () => {
    const { openAt: _openAt, ...rest } = filters;
    onChange(rest);
  };

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
      <label>
        Show
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value as StatusFilter })}
        >
          <option value="all">Visited + saved</option>
          <option value="visited">Visited</option>
          <option value="bookmarked">Saved</option>
          <option value="to-try">Saved, not visited</option>
        </select>
      </label>
      <label>
        Places
        <select
          value={filters.review}
          onChange={(e) => set({ review: e.target.value as ReviewFilter })}
        >
          <option value="likely">Cafés</option>
          <option value="pending">Needs review</option>
          <option value="all">Everything</option>
        </select>
      </label>
      <label>
        Sort
        <select
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as SortKey })}
        >
          <option value="score">Score</option>
          <option value="visits">Most visited</option>
          <option value="recent">Recently visited</option>
          <option value="name">Name</option>
        </select>
      </label>
      <fieldset className="chips">
        <legend className="sr-only">Requirements</legend>
        <button
          type="button"
          aria-pressed={filters.sockets}
          onClick={() => toggle("sockets")}
        >
          🔌 Sockets
        </button>
        <button
          type="button"
          aria-pressed={filters.wifi}
          onClick={() => toggle("wifi")}
        >
          📶 Wi-Fi
        </button>
        <button
          type="button"
          aria-pressed={filters.weekend}
          onClick={() => toggle("weekend")}
        >
          Open weekends
        </button>
        <button
          type="button"
          aria-pressed={filters.independent}
          onClick={() => toggle("independent")}
        >
          Independent
        </button>
        <button
          type="button"
          aria-pressed={openAt !== undefined}
          onClick={openAt ? withoutOpenAt : openNow}
        >
          🕒 Open at…
        </button>
      </fieldset>
      {openAt && (
        <fieldset className="open-at">
          <legend className="sr-only">Open at</legend>
          <select
            aria-label="Day"
            value={openAt.day}
            onChange={(e) =>
              set({ openAt: { ...openAt, day: Number(e.target.value) } })
            }
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
              set({ openAt: { ...openAt, minute: fromTime(e.target.value) } })
            }
          />
        </fieldset>
      )}
      <output aria-live="polite">{count} places</output>
    </form>
  );
}
