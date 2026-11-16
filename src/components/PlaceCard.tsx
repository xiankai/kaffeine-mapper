import { Link } from "react-router-dom";
import { RankedPlace } from "../domain/filters";
import { displayName, isChain } from "../domain/insights";
import { scoreClass } from "./scoreClass";

interface Props {
  ranked: RankedPlace;
  chainCounts: Map<string, number>;
}

export function PlaceCard({ ranked: { place, score }, chainCounts }: Props) {
  const chain = isChain(place, chainCounts);
  const { metrics } = score;
  return (
    <li className="card">
      <Link to={`/place/${encodeURIComponent(place.id)}`}>
        <span
          className={`score ${scoreClass(score.value)}`}
          title={`${Math.round(score.coverage * 100)}% of weighted criteria known`}
        >
          {score.value ?? "?"}
        </span>
        <span className="card-main">
          <strong>{displayName(place)}</strong>
          <span className="meta">
            {place.visits.length > 0 && (
              <span>{place.visits.length} visits</span>
            )}
            {place.lists.map((l) => (
              <span key={l} className="tag">
                {l}
              </span>
            ))}
            {chain && <span className="tag muted">chain</span>}
            {place.review === "pending" && (
              <span className="tag warn">unreviewed</span>
            )}
          </span>
          <span className="meta">
            {metrics.sockets !== undefined && (
              <span>🔌 {Math.round(metrics.sockets * 100)}</span>
            )}
            {metrics.wifi !== undefined && (
              <span>📶 {Math.round(metrics.wifi * 100)}</span>
            )}
            {metrics.hours !== undefined && (
              <span>🕒 {Math.round(metrics.hours * 100)}</span>
            )}
            <span className="muted">
              {Math.round(score.coverage * 100)}% known
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
