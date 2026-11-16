import { Link, useParams } from "react-router-dom";
import {
  displayName,
  isChain,
  scheduleOf,
  visitPattern,
} from "../domain/insights";
import { METRIC_LABELS, METRICS, scorePlace } from "../domain/scoring";
import { Review } from "../domain/types";
import { WeekSchedule } from "../domain/openingHours";
import { useStore } from "../state/store";
import { AttributeEditor } from "./AttributeEditor";
import { scoreClass } from "./scoreClass";
import { VisitHeatmap } from "./VisitHeatmap";

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmt = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function HoursTable({ schedule }: { schedule: WeekSchedule }) {
  return (
    <table className="hours">
      <tbody>
        {WEEK.map((d) => (
          <tr key={d}>
            <th scope="row">{DAY_NAMES[d]}</th>
            <td>
              {schedule[d]?.length
                ? schedule[d]!.map(([s, e]) => `${fmt(s)}–${fmt(e)}`).join(", ")
                : "closed"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const REVIEW_LABELS: Record<Review, string> = {
  cafe: "Café ✓",
  "not-cafe": "Not a café",
  pending: "Unsure",
};

export function PlaceDetail() {
  const { id = "" } = useParams();
  const { dataset, scoreContext, editPlace } = useStore();
  const place = dataset.places.find(
    (p) => p.id === id || p.aliases?.includes(id),
  );
  if (!place)
    return (
      <p className="empty">
        Place not found. <Link to="/explore">Back</Link>
      </p>
    );

  const score = scorePlace(place, scoreContext);
  const pattern = visitPattern(place);
  const schedule = scheduleOf(place);
  const chain = isChain(place, scoreContext.chainCounts);
  const tags = place.osm?.tags ?? {};
  const mapsUrl =
    place.url ??
    (place.googlePlaceId
      ? `https://www.google.com/maps/place/?q=place_id:${place.googlePlaceId}`
      : undefined);

  return (
    <article className="detail">
      <Link to="/explore" className="back">
        ← All places
      </Link>
      <header className="detail-head">
        <span className={`score big ${scoreClass(score.value)}`}>
          {score.value ?? "?"}
        </span>
        <div>
          <h1>{displayName(place)}</h1>
          <p className="meta">
            {place.address && <span>{place.address}</span>}
            {chain !== undefined && (
              <span className="tag">{chain ? "Chain" : "Independent"}</span>
            )}
            {place.lists.map((l) => (
              <span key={l} className="tag">
                {l}
              </span>
            ))}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                Google Maps
              </a>
            )}
            {place.osm && (
              <a
                href={`https://www.openstreetmap.org/${place.osm.id}`}
                target="_blank"
                rel="noreferrer"
              >
                OSM match{place.osm.name ? `: ${place.osm.name}` : ""} (
                {place.osm.distanceM} m)
              </a>
            )}
          </p>
        </div>
      </header>

      <section aria-label="Is this a café?" className="review">
        <span>Is this a café?</span>
        {(["cafe", "not-cafe", "pending"] as Review[]).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={place.review === r}
            onClick={() => editPlace(place.id, (p) => ({ ...p, review: r }))}
          >
            {REVIEW_LABELS[r]}
          </button>
        ))}
      </section>

      <div className="detail-grid">
        <section>
          <h2>Score breakdown</h2>
          <p className="muted">
            {Math.round(score.coverage * 100)}% of your weighted criteria are
            known. Unknowns don&apos;t count against it.
          </p>
          <dl className="metrics">
            {METRICS.filter((m) => scoreContext.preferences.weights[m] > 0).map(
              (m) => (
                <div key={m}>
                  <dt>{METRIC_LABELS[m]}</dt>
                  <dd>
                    {score.metrics[m] === undefined ? (
                      <span className="muted">unknown</span>
                    ) : (
                      <meter
                        min={0}
                        max={1}
                        value={score.metrics[m]}
                        aria-label={METRIC_LABELS[m]}
                      />
                    )}
                  </dd>
                </div>
              ),
            )}
          </dl>
          <h2>Opening hours</h2>
          {schedule ? (
            <HoursTable schedule={schedule} />
          ) : (
            <p className="muted">
              {tags.opening_hours
                ? `Unparsed: ${tags.opening_hours}`
                : "Not in OpenStreetMap."}
            </p>
          )}
          {(tags.internet_access || tags.power_supply) && (
            <p className="muted">
              OSM says:{" "}
              {tags.internet_access &&
                `internet ${tags.internet_access}${tags["internet_access:fee"] ? ` (fee: ${tags["internet_access:fee"]})` : ""}`}
              {tags.power_supply && ` · power ${tags.power_supply}`}
            </p>
          )}
        </section>
        <section>
          <h2>Your notes</h2>
          <AttributeEditor
            manual={place.manual}
            onChange={(manual) =>
              editPlace(place.id, (p) => ({ ...p, manual }))
            }
          />
        </section>
        <section className="span-2">
          <h2>When you go</h2>
          {pattern.total === 0 ? (
            <p className="muted">
              Saved, never visited
              {place.googleNote ? ` · “${place.googleNote}”` : ""}.
            </p>
          ) : (
            <>
              <p className="muted">
                {pattern.total} visits · median {pattern.medianMinutes} min ·{" "}
                {Math.round(pattern.weekendShare * 100)}% on weekends
                {pattern.lastVisit &&
                  ` · last ${pattern.lastVisit.slice(0, 10)}`}
              </p>
              <VisitHeatmap heatmap={pattern.heatmap} />
            </>
          )}
        </section>
      </div>
    </article>
  );
}
