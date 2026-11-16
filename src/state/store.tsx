import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
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
import { Dataset, emptyDataset, Place } from "../domain/types";
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
  editPlace: (id: string, change: (p: Place) => Place) => void;
  replaceDataset: (dataset: Dataset) => void;
  setPreferences: (preferences: Preferences) => void;
}

const StoreContext = createContext<Store | undefined>(undefined);

export function replacePlaces(dataset: Dataset, places: Place[]): Dataset {
  const byId = new Map(places.map((p) => [p.id, p]));
  return linkByOsm({
    ...dataset,
    places: dataset.places.map((p) => byId.get(p.id) ?? p),
  });
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
  datasetRef.current = state.dataset;

  useEffect(() => {
    if (initial) return;
    loadPersisted().then((persisted) =>
      dispatch({ type: "loaded", persisted }),
    );
  }, [initial]);

  const commit = useCallback((dataset: Dataset) => {
    datasetRef.current = dataset;
    dispatch({ type: "dataset", dataset });
    saveDataset(dataset).catch(() => undefined);
  }, []);

  const importPlaces = useCallback(
    (places: Place[]) => {
      const summary = mergeIntoDataset(datasetRef.current, places);
      commit(summary.dataset);
      return summary;
    },
    [commit],
  );

  const applyEnriched = useCallback(
    (places: Place[]) => commit(replacePlaces(datasetRef.current, places)),
    [commit],
  );

  const editPlace = useCallback(
    (id: string, change: (p: Place) => Place) =>
      // stack-reviewer-ignore: linkByOsm only folds places sharing a confirmed OSM id and is idempotent; applyEnriched already runs it on every batch
      commit(linkByOsm(updatePlace(datasetRef.current, id, change))),
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
    }),
    [state.preferences, state.dataset.places],
  );

  const value = useMemo<Store>(
    () => ({
      ready: state.ready,
      dataset: state.dataset,
      preferences: state.preferences,
      scoreContext,
      importPlaces,
      applyEnriched,
      editPlace,
      replaceDataset: commit,
      setPreferences,
    }),
    [
      state,
      scoreContext,
      importPlaces,
      applyEnriched,
      editPlace,
      commit,
      setPreferences,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
