import { useMemo } from "react";
import { ChainEntry, groupByChain, ListEntry } from "../domain/chains";
import { RankedPlace } from "../domain/filters";
import { Review } from "../domain/types";
import { PlaceCard } from "./PlaceCard";
import { scoreClass } from "./scoreClass";

type Decide = (ids: string[], review: Review) => void;

interface Props {
  ranked: RankedPlace[];
  grouped: boolean;
  shown: number;
  chainCounts: Map<string, number>;
  onDecide: Decide;
  onMore: () => void;
}

function bestScore(branches: RankedPlace[]): number | undefined {
  const values = branches.flatMap((b) => b.score.value ?? []);
  return values.length ? Math.max(...values) : undefined;
}

function ChainRow({
  entry,
  chainCounts,
  onDecide,
}: {
  entry: ChainEntry<RankedPlace>;
  chainCounts: Map<string, number>;
  onDecide: Decide;
}) {
  const count = entry.branches.length;
  const best = bestScore(entry.branches);
  const ids = entry.branches.map((b) => b.place.id);
  return (
    <li className="card chain-row">
      <details>
        <summary>
          <span
            className={`score ${scoreClass(best)}`}
            title="Best branch score"
          >
            {best ?? "?"}
          </span>
          <span className="card-main">
            <strong>
              {entry.label} ×{count}
            </strong>
            <span className="meta">{count} branches in this area</span>
          </span>
        </summary>
        <div className="chain-actions">
          <button type="button" onClick={() => onDecide(ids, "cafe")}>
            Mark all {count} branches as cafés
          </button>
          <button type="button" onClick={() => onDecide(ids, "not-cafe")}>
            Mark all {count} as not cafés
          </button>
        </div>
        <ol className="cards">
          {entry.branches.map((r) => (
            <PlaceCard key={r.place.id} ranked={r} chainCounts={chainCounts} />
          ))}
        </ol>
      </details>
    </li>
  );
}

function flatEntries(ranked: RankedPlace[]): ListEntry<RankedPlace>[] {
  return ranked.map((item) => ({ kind: "place", item }));
}

export function ResultList({
  ranked,
  grouped,
  shown,
  chainCounts,
  onDecide,
  onMore,
}: Props) {
  const entries = useMemo(
    () => (grouped ? groupByChain(ranked, chainCounts) : flatEntries(ranked)),
    [ranked, grouped, chainCounts],
  );
  return (
    <>
      <ol className="cards">
        {entries
          .slice(0, shown)
          .map((entry) =>
            entry.kind === "chain" ? (
              <ChainRow
                key={`chain:${entry.key}`}
                entry={entry}
                chainCounts={chainCounts}
                onDecide={onDecide}
              />
            ) : (
              <PlaceCard
                key={entry.item.place.id}
                ranked={entry.item}
                chainCounts={chainCounts}
              />
            ),
          )}
      </ol>
      {entries.length > shown && (
        <button type="button" className="more" onClick={onMore}>
          Show more ({entries.length - shown} left)
        </button>
      )}
    </>
  );
}
