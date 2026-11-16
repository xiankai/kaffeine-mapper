const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

export function VisitHeatmap({ heatmap }: { heatmap: number[][] }) {
  const max = Math.max(1, ...heatmap.flat());
  return (
    <table className="heatmap" aria-label="Visits by weekday and hour">
      <thead>
        <tr>
          <th />
          {HOURS.map((h) => (
            <th key={h} scope="col">
              {h % 3 === 0 ? h : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {WEEK.map((d) => (
          <tr key={d}>
            <th scope="row">{DAY_NAMES[d]}</th>
            {HOURS.map((h) => {
              const n = heatmap[d]?.[h] ?? 0;
              return (
                <td
                  key={h}
                  title={`${DAY_NAMES[d]} ${h}:00 — ${n} visits`}
                  style={{ opacity: n ? 0.2 + (0.8 * n) / max : 1 }}
                  className={n ? "hot" : ""}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
