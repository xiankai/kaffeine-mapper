import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GOOGLE_MAPS_API_KEY } from "../config";
import { chainKey } from "../domain/chains";
import {
  confirmedAt,
  editManual,
  evaluationNotes,
  relativeDate,
} from "../domain/evaluations";
import {
  chainName,
  displayName,
  findPlace,
  isChain,
  scheduleOf,
  visitPattern,
} from "../domain/insights";
import { WeekSchedule } from "../domain/openingHours";
import { METRIC_LABELS, METRICS, Score, scorePlace } from "../domain/scoring";
import {
  Assessed,
  ManualAttributes,
  OsmMatch,
  Place,
  Review,
} from "../domain/types";
import { pickCandidate, rejectCandidates } from "../domain/merge";
import { decideReview } from "../domain/triage";
import { useCheckIn } from "../hooks/useCheckIn";
import { useStore } from "../state/store";
import { AttributeEditor } from "./AttributeEditor";
import { CheckInOutcome } from "./EvaluationSheet";
import { GooglePlaceCard } from "./GooglePlaceCard";
import { scoreClass } from "./scoreClass";
import { VisitHeatmap } from "./VisitHeatmap";

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REVIEWS: Array<[Review, string]> = [
  ["cafe", "Café ✓"],
  ["not-cafe", "Not a café"],
  ["pending", "Unsure"],
];

const fmt = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function googleMapsUrl(place: Place): string | undefined {
  if (place.url) return place.url;
  return place.googlePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${place.googlePlaceId}`
    : undefined;
}

function osmSummary(tags: Record<string, string>): string | undefined {
  const fee = tags["internet_access:fee"]
    ? ` (fee: ${tags["internet_access:fee"]})`
    : "";
  const parts = [
    tags.internet_access && `internet ${tags.internet_access}${fee}`,
    tags.power_supply && `power ${tags.power_supply}`,
  ].filter(Boolean);
  return parts.length ? `OSM says: ${parts.join(" · ")}` : undefined;
}

function PlaceHeader({
  place,
  score,
  chain,
}: {
  place: Place;
  score: Score;
  chain: boolean | undefined;
}) {
  const mapsUrl = googleMapsUrl(place);
  return (
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
  );
}

function GoogleSection({ place }: { place: Place }) {
  const mapsUrl = googleMapsUrl(place);
  if (!GOOGLE_MAPS_API_KEY || !place.googlePlaceId || !mapsUrl) return null;
  return (
    <GooglePlaceCard
      apiKey={GOOGLE_MAPS_API_KEY}
      placeId={place.googlePlaceId}
      mapsUrl={mapsUrl}
    />
  );
}

function ReviewButtons({
  review,
  onChange,
}: {
  review: Review;
  onChange: (review: Review) => void;
}) {
  return (
    <section aria-label="Is this a café?" className="review">
      <span>Is this a café?</span>
      {REVIEWS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={review === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </section>
  );
}

function autoReviewText(place: Place): string {
  if (place.reviewBy === "auto")
    return "Auto-confirmed as a café: a close OpenStreetMap match and a long visit.";
  return place.review === "cafe"
    ? "Auto-confirmed as a café: Google lists it as a café."
    : "Marked not a café: Google lists it as something else.";
}

function AutoReviewNotice({
  place,
  onUndo,
}: {
  place: Place;
  onUndo: () => void;
}) {
  return (
    <section aria-label="Auto-confirmed" className="auto-review">
      <span className="muted">{autoReviewText(place)}</span>
      <button type="button" onClick={onUndo}>
        Undo
      </button>
    </section>
  );
}

function CandidatePicker({
  candidates,
  onPick,
  onReject,
}: {
  candidates: OsmMatch[];
  onPick: (chosen: OsmMatch) => void;
  onReject: () => void;
}) {
  return (
    <section aria-label="Which café was it?" className="review">
      <span>Several cafés are this close. Which one was it?</span>
      {candidates.map((c) => (
        <button key={c.id} type="button" onClick={() => onPick(c)}>
          {c.name ?? "Unnamed café"} ({c.distanceM} m)
        </button>
      ))}
      <button type="button" onClick={onReject}>
        None of these
      </button>
    </section>
  );
}

function ScoreBreakdown({
  score,
  weights,
}: {
  score: Score;
  weights: Record<string, number>;
}) {
  return (
    <>
      <h2>Score breakdown</h2>
      <p className="muted">
        {Math.round(score.coverage * 100)}% of your weighted criteria are known.
        Unknowns don&apos;t count against it.
      </p>
      <dl className="metrics">
        {METRICS.filter((m) => (weights[m] ?? 0) > 0).map((m) => (
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
        ))}
      </dl>
    </>
  );
}

function OpeningHours({
  schedule,
  tags,
}: {
  schedule: WeekSchedule | undefined;
  tags: Record<string, string>;
}) {
  const summary = osmSummary(tags);
  return (
    <>
      <h2>Opening hours</h2>
      {schedule ? (
        <table className="hours">
          <tbody>
            {WEEK.map((d) => (
              <tr key={d}>
                <th scope="row">{DAY_NAMES[d]}</th>
                <td>
                  {schedule[d]?.length
                    ? schedule[d]!.map(([s, e]) => `${fmt(s)}–${fmt(e)}`).join(
                        ", ",
                      )
                    : "closed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">
          {tags.opening_hours
            ? `Unparsed: ${tags.opening_hours}`
            : "Not in OpenStreetMap."}
        </p>
      )}
      {summary && <p className="muted">{summary}</p>}
    </>
  );
}

function WhenYouGo({ place }: { place: Place }) {
  const pattern = visitPattern(place);
  if (pattern.total === 0) {
    return (
      <p className="muted">
        Saved, never visited{place.googleNote ? ` · “${place.googleNote}”` : ""}
        .
      </p>
    );
  }
  return (
    <>
      <p className="muted">
        {pattern.total} visits ·{" "}
        {pattern.medianMinutes !== undefined &&
          `median ${pattern.medianMinutes} min · `}
        {Math.round(pattern.weekendShare * 100)}% on weekends
        {pattern.lastVisit && ` · last ${pattern.lastVisit.slice(0, 10)}`}
      </p>
      <VisitHeatmap heatmap={pattern.heatmap} />
    </>
  );
}

function confirmedLabels(target: Assessed, now: Date) {
  return Object.fromEntries(
    Object.entries(confirmedAt(target)).map(([key, at]) => [
      key,
      relativeDate(at, now),
    ]),
  );
}

function ChainDefaultsSection({
  name,
  defaults,
  onChange,
}: {
  name: string;
  defaults: Assessed;
  onChange: (manual: ManualAttributes) => void;
}) {
  const [now] = useState(() => new Date());
  return (
    <section aria-label="Chain defaults">
      <h2>Every {name} branch</h2>
      <p className="muted">Used for any branch that has no value of its own.</p>
      <AttributeEditor
        manual={defaults.manual}
        confirmed={confirmedLabels(defaults, now)}
        onChange={onChange}
        chainDefaults
      />
    </section>
  );
}

function YourNotes({
  place,
  fromChain,
  onChange,
}: {
  place: Place;
  fromChain: ManualAttributes | undefined;
  onChange: (manual: ManualAttributes) => void;
}) {
  const [now] = useState(() => new Date());
  const notes = evaluationNotes(place);
  return (
    <section>
      <h2>Your notes</h2>
      <AttributeEditor
        manual={place.manual}
        confirmed={confirmedLabels(place, now)}
        fromChain={fromChain}
        onChange={onChange}
      />
      {notes.length > 0 && (
        <ul className="visit-notes" aria-label="Notes from your visits">
          {notes.map((e) => (
            <li key={e.at}>
              <span className="muted">{relativeDate(e.at, now)}</span> {e.note}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewSection({
  place,
  editPlace,
}: {
  place: Place;
  editPlace: (id: string, change: (p: Place) => Place) => void;
}) {
  const decide = (review: Review) =>
    editPlace(place.id, (p) => decideReview(p, review));
  if (place.osmCandidates?.length) {
    return (
      <CandidatePicker
        candidates={place.osmCandidates}
        onPick={(chosen) =>
          editPlace(place.id, (p) => pickCandidate(p, chosen))
        }
        onReject={() => editPlace(place.id, rejectCandidates)}
      />
    );
  }
  return (
    <>
      {(place.reviewBy === "auto" || place.reviewBy === "google") && (
        <AutoReviewNotice place={place} onUndo={() => decide("pending")} />
      )}
      <ReviewButtons review={place.review} onChange={decide} />
    </>
  );
}

export function PlaceDetail() {
  const { id = "" } = useParams();
  const { dataset, scoreContext, editPlace, editChain } = useStore();
  const checkIn = useCheckIn();
  const place = findPlace(dataset.places, id);
  if (!place) {
    return (
      <p className="empty">
        Place not found. <Link to="/explore">Back</Link>
      </p>
    );
  }
  const score = scorePlace(place, scoreContext);
  const key = chainKey(place, scoreContext.chainCounts);
  const defaults = key ? dataset.chains?.[key] : undefined;

  return (
    <article className="detail">
      <Link to="/explore" className="back">
        ← All places
      </Link>
      <PlaceHeader
        place={place}
        score={score}
        chain={isChain(place, scoreContext.chainCounts)}
      />
      <GoogleSection place={place} />
      <section className="checkin" aria-label="Check in">
        <button type="button" onClick={() => checkIn.checkIn(place.id)}>
          📍 I&apos;m here
        </button>
      </section>
      <CheckInOutcome flow={checkIn} />
      <ReviewSection place={place} editPlace={editPlace} />
      <div className="detail-grid">
        <section>
          <ScoreBreakdown
            score={score}
            weights={scoreContext.preferences.weights}
          />
          <OpeningHours
            schedule={scheduleOf(place)}
            tags={place.osm?.tags ?? {}}
          />
        </section>
        <YourNotes
          place={place}
          fromChain={defaults?.manual}
          onChange={(manual) =>
            editPlace(place.id, (p) => editManual(p, manual, new Date()))
          }
        />
        {key && (
          <ChainDefaultsSection
            name={chainName(place) ?? key}
            defaults={defaults ?? { manual: {} }}
            onChange={(manual) =>
              editChain(key, (d) => editManual(d, manual, new Date()))
            }
          />
        )}
        <section className="span-2">
          <h2>When you go</h2>
          <WhenYouGo place={place} />
        </section>
      </div>
    </article>
  );
}
