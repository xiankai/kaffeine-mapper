import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_FILTERS, Filters, rankPlaces } from "../domain/filters";
import { useArea } from "../hooks/useArea";
import { useCheckIn } from "../hooks/useCheckIn";
import { useStore } from "../state/store";
import { AreaPicker } from "./AreaPicker";
import { CheckInPanel, FreshnessLine } from "./CheckInPanel";
import { CheckInOutcome } from "./EvaluationSheet";
import { FilterBar } from "./FilterBar";
import { ResultList } from "./ResultList";

const MapPanel = lazy(() => import("./MapPanel"));

const PAGE_SIZE = 60;

export function ExplorePage() {
  const { dataset, scoreContext, decidePlaces } = useStore();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [shown, setShown] = useState(PAGE_SIZE);
  const area = useArea(dataset.places);
  const checkIn = useCheckIn();
  const ranked = useMemo(
    () =>
      rankPlaces(
        dataset.places,
        { ...filters, area: area.center },
        scoreContext,
      ),
    [dataset.places, filters, area.center, scoreContext],
  );

  if (dataset.places.length === 0) {
    return (
      <p className="empty">
        No places yet.{" "}
        <Link to="/import">Import your Timeline or saved lists</Link> to start.
      </p>
    );
  }

  return (
    <div className="explore">
      <div className="explore-head">
        <FreshnessLine places={dataset.places} />
        <CheckInPanel places={dataset.places} onCheckIn={checkIn.checkIn} />
      </div>
      <CheckInOutcome flow={checkIn} />
      <AreaPicker
        mode={area.mode}
        status={area.status}
        onChange={(m) => (area.chooseMode(m), setShown(PAGE_SIZE))}
      />
      <FilterBar
        filters={filters}
        onChange={(f) => (setFilters(f), setShown(PAGE_SIZE))}
        count={ranked.length}
      />
      <div className="explore-body">
        <section className="results" aria-label="Ranked places">
          {ranked.length === 0 && (
            <p className="empty">
              Nothing matches these filters
              {area.mode === "everywhere" ? "." : " in this area."}
            </p>
          )}
          <ResultList
            ranked={ranked}
            grouped={filters.groupChains}
            shown={shown}
            chainCounts={scoreContext.chainCounts}
            onDecide={decidePlaces}
            onMore={() => setShown(shown + PAGE_SIZE)}
          />
        </section>
        <Suspense fallback={<div className="map-panel" />}>
          <MapPanel
            ranked={ranked}
            places={dataset.places}
            chainCounts={scoreContext.chainCounts}
          />
        </Suspense>
      </div>
    </div>
  );
}
