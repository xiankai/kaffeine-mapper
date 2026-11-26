import {
  ActionDispatch,
  createContext,
  ReactNode,
  RefObject,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { updateChain } from "../domain/chains";
import { chainNameCounts } from "../domain/insights";
import {
  linkByOsm,
  mergeIntoDataset,
  MergeSummary,
  updatePlace,
} from "../domain/merge";
import {
  DEFAULT_PREFERENCES,
  Preferences,
  ScoreContext,
} from "../domain/scoring";
import {
  applyGoogleTypes,
  decideMany,
  GoogleTypeResult,
  triageDataset,
} from "../domain/triage";
import {
  ChainDefaults,
  Dataset,
  emptyDataset,
  Place,
  Review,
} from "../domain/types";
import {
  loadPersisted,
  Persisted,
  saveDataset,
  savePreferences,
} from "../services/storage";

interface State extends Persisted {
  ready: boolean;
}

type Action =
  | { type: "loaded"; persisted: Persisted }
  | { type: "dataset"; dataset: Dataset }
  | { type: "preferences"; preferences: Preferences };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      return { ...action.persisted, ready: true };
    case "dataset":
      return { ...state, dataset: action.dataset };
    case "preferences":
      return { ...state, preferences: action.preferences };
  }
}

export interface Store {
  ready: boolean;
  dataset: Dataset;
  preferences: Preferences;
  scoreContext: ScoreContext;
  importPlaces: (places: Place[]) => MergeSummary;
  applyEnriched: (places: Place[]) => void;
  applyOsm: (places: Place[]) => void;
  applyGoogle: (results: GoogleTypeResult[]) => void;
  editPlace: (id: string, change: (p: Place) => Place) => void;
  decidePlaces: (ids: string[], review: Review) => void;
  editChain: (
    key: string,
    change: (defaults: ChainDefaults) => ChainDefaults,
  ) => void;
  replaceDataset: (dataset: Dataset) => void;
  setPreferences: (preferences: Preferences) => void;
}

const StoreContext = createContext<Store | undefined>(undefined);

export function replacePlaces(dataset: Dataset, places: Place[]): Dataset {
  const byId = new Map(places.map((p) => [p.id, p]));
  return triageDataset(
    linkByOsm({
      ...dataset,
      places: dataset.places.map((p) => byId.get(p.id) ?? p),
    }),
  );
}

function withOsmFrom(current: Place, enriched: Place): Place {
  const { osm: _osm, osmCandidates: _candidates, ...rest } = current;
  return {
    ...rest,
    ...(enriched.osm && { osm: enriched.osm }),
    ...(enriched.osmCandidates && { osmCandidates: enriched.osmCandidates }),
    ...(enriched.osmCheckedAt && { osmCheckedAt: enriched.osmCheckedAt }),
    ...(enriched.osmMatcher !== undefined && {
      osmMatcher: enriched.osmMatcher,
    }),
  };
}

export function mergeOsm(dataset: Dataset, enriched: Place[]): Dataset {
  const byId = new Map(enriched.map((p) => [p.id, p]));
  return triageDataset(
    linkByOsm({
      ...dataset,
      places: dataset.places.map((p) => {
        const match = byId.get(p.id);
        return match ? withOsmFrom(p, match) : p;
      }),
    }),
  );
}

function useLoadPersisted(
  initial: Persisted | undefined,
  datasetRef: RefObject<Dataset>,
  dispatch: ActionDispatch<[Action]>,
) {
  useEffect(() => {
    if (initial) return;
    loadPersisted().then((stored) => {
      const persisted = { ...stored, dataset: triageDataset(stored.dataset) };
      datasetRef.current = persisted.dataset;
      dispatch({ type: "loaded", persisted });
    });
  }, [initial, datasetRef, dispatch]);
}

function useApplyGoogle(
  datasetRef: RefObject<Dataset>,
  commit: (dataset: Dataset) => void,
) {
  return useCallback(
    (results: GoogleTypeResult[]) =>
      commit(
        applyGoogleTypes(datasetRef.current, results, new Date().toISOString()),
      ),
    [datasetRef, commit],
  );
}

export function StoreProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Persisted;
}) {
  const [state, dispatch] = useReducer(reducer, {
    ...(initial ?? {
      dataset: emptyDataset(),
      preferences: DEFAULT_PREFERENCES,
    }),
    ready: initial !== undefined,
  });
  const datasetRef = useRef(state.dataset);
  useLoadPersisted(initial, datasetRef, dispatch);

  const commit = useCallback((dataset: Dataset) => {
    datasetRef.current = dataset;
    dispatch({ type: "dataset", dataset });
    saveDataset(dataset).catch(() => undefined);
  }, []);

  const importPlaces = useCallback(
    (places: Place[]) => {
      const summary = mergeIntoDataset(datasetRef.current, places);
      commit(triageDataset(summary.dataset));
      return summary;
    },
    [commit],
  );

  const applyEnriched = useCallback(
    (places: Place[]) => commit(replacePlaces(datasetRef.current, places)),
    [commit],
  );

  const applyOsm = useCallback(
    (places: Place[]) => commit(mergeOsm(datasetRef.current, places)),
    [commit],
  );

  const applyGoogle = useApplyGoogle(datasetRef, commit);

  const editPlace = useCallback(
    (id: string, change: (p: Place) => Place) =>
      // stack-reviewer-ignore: linkByOsm only folds places sharing a confirmed OSM id and is idempotent; applyEnriched already runs it on every batch
      commit(linkByOsm(updatePlace(datasetRef.current, id, change))),
    [commit],
  );

  const decidePlaces = useCallback(
    (ids: string[], review: Review) =>
      commit(linkByOsm(decideMany(datasetRef.current, ids, review))),
    [commit],
  );

  const editChain = useCallback(
    (key: string, change: (defaults: ChainDefaults) => ChainDefaults) =>
      commit(updateChain(datasetRef.current, key, change)),
    [commit],
  );

  const setPreferences = useCallback((preferences: Preferences) => {
    dispatch({ type: "preferences", preferences });
    savePreferences(preferences).catch(() => undefined);
  }, []);

  const scoreContext = useMemo(
    () => ({
      preferences: state.preferences,
      chainCounts: chainNameCounts(state.dataset.places),
      ...(state.dataset.chains && { chains: state.dataset.chains }),
    }),
    [state.preferences, state.dataset.places, state.dataset.chains],
  );

  const value = useMemo<Store>(
    () => ({
      ready: state.ready,
      dataset: state.dataset,
      preferences: state.preferences,
      scoreContext,
      importPlaces,
      applyEnriched,
      applyOsm,
      applyGoogle,
      editPlace,
      decidePlaces,
      editChain,
      replaceDataset: commit,
      setPreferences,
    }),
    [
      state,
      scoreContext,
      importPlaces,
      applyEnriched,
      applyOsm,
      applyGoogle,
      editPlace,
      decidePlaces,
      editChain,
      commit,
      setPreferences,
    ],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore(): Store {
  const store = use(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
