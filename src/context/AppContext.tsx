import React, { createContext, useContext, useReducer } from "react";
import {
  CafeLocation,
  ViewMode,
  TimelineFilters,
  MapViewSettings,
  ImportSession,
} from "../types";

interface AppState {
  cafes: CafeLocation[];
  selectedCafe: CafeLocation | undefined;
  currentView: ViewMode;
  filters: TimelineFilters;
  mapSettings: MapViewSettings;
  isLoading: boolean;
  error: string | undefined;
  importSessions: ImportSession[];
}

type AppAction =
  | { type: "SET_CAFES"; cafes: CafeLocation[] }
  | { type: "ADD_CAFE"; cafe: CafeLocation }
  | { type: "UPDATE_CAFE"; cafe: CafeLocation }
  | { type: "DELETE_CAFE"; id: string }
  | { type: "SELECT_CAFE"; cafe: CafeLocation | undefined }
  | { type: "SET_VIEW"; view: ViewMode }
  | { type: "SET_FILTERS"; filters: TimelineFilters }
  | { type: "SET_MAP_SETTINGS"; settings: MapViewSettings }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | undefined }
  | { type: "ADD_IMPORT_SESSION"; session: ImportSession }
  | { type: "UPDATE_IMPORT_SESSION"; session: ImportSession };

const initialState: AppState = {
  cafes: [],
  selectedCafe: undefined,
  currentView: "map",
  filters: {},
  mapSettings: {
    center: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco default
    zoom: 13,
    showVisitDensity: false,
    showFavoritesOnly: false,
    clusterMarkers: true,
  },
  isLoading: false,
  error: undefined,
  importSessions: [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionHandler = (state: AppState, action: any) => AppState;

const reducerHandlers: Record<string, ActionHandler> = {
  SET_CAFES: (state, { cafes }) => ({ ...state, cafes }),
  ADD_CAFE: (state, { cafe }) => ({ ...state, cafes: [...state.cafes, cafe] }),
  UPDATE_CAFE: (state, { cafe }) => ({
    ...state,
    cafes: state.cafes.map((c) => (c.id === cafe.id ? cafe : c)),
    selectedCafe:
      state.selectedCafe?.id === cafe.id ? cafe : state.selectedCafe,
  }),
  DELETE_CAFE: (state, { id }) => ({
    ...state,
    cafes: state.cafes.filter((c) => c.id !== id),
    selectedCafe:
      state.selectedCafe?.id === id ? undefined : state.selectedCafe,
  }),
  SELECT_CAFE: (state, { cafe }) => ({ ...state, selectedCafe: cafe }),
  SET_VIEW: (state, { view }) => ({ ...state, currentView: view }),
  SET_FILTERS: (state, { filters }) => ({ ...state, filters }),
  SET_MAP_SETTINGS: (state, { settings }) => ({
    ...state,
    mapSettings: { ...state.mapSettings, ...settings },
  }),
  SET_LOADING: (state, { loading }) => ({ ...state, isLoading: loading }),
  SET_ERROR: (state, { error }) => ({ ...state, error }),
  ADD_IMPORT_SESSION: (state, { session }) => ({
    ...state,
    importSessions: [...state.importSessions, session],
  }),
  UPDATE_IMPORT_SESSION: (state, { session }) => ({
    ...state,
    importSessions: state.importSessions.map((s) =>
      s.id === session.id ? session : s,
    ),
  }),
};

function appReducer(state: AppState, action: AppAction): AppState {
  const handler = reducerHandlers[action.type];
  return handler ? handler(state, action) : state;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;

  // Convenience methods
  addCafe: (
    cafe: Omit<CafeLocation, "id" | "createdAt" | "updatedAt" | "totalVisits">,
  ) => void;
  updateCafe: (cafe: CafeLocation) => void;
  deleteCafe: (id: string) => void;
  selectCafe: (cafe?: CafeLocation) => void;
  setView: (view: ViewMode) => void;
  setFilters: (filters: TimelineFilters) => void;
  setMapSettings: (settings: Partial<MapViewSettings>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function buildAddCafe(dispatch: React.Dispatch<AppAction>) {
  return (
    cafeData: Omit<
      CafeLocation,
      "id" | "createdAt" | "updatedAt" | "totalVisits"
    >,
  ) => {
    const cafe: CafeLocation = {
      ...cafeData,
      id: `cafe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalVisits: cafeData.visits.length,
    };
    dispatch({ type: "ADD_CAFE", cafe });
  };
}

function buildUpdateCafe(dispatch: React.Dispatch<AppAction>) {
  return (cafe: CafeLocation) => {
    const ratedVisits = cafe.visits.filter((visit) => visit.rating);
    const updatedCafe: CafeLocation = {
      ...cafe,
      updatedAt: new Date().toISOString(),
      totalVisits: cafe.visits.length,
      ...(cafe.visits.length > 0 && {
        lastVisited: cafe.visits.reduce(
          (latest, visit) =>
            visit.visitedAt > latest ? visit.visitedAt : latest,
          cafe.visits[0]!.visitedAt,
        ),
      }),
      ...(ratedVisits.length > 0 && {
        averageRating: ratedVisits.reduce(
          (sum, visit) => sum + visit.rating! / ratedVisits.length,
          0,
        ),
      }),
    };
    dispatch({ type: "UPDATE_CAFE", cafe: updatedCafe });
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addCafe = buildAddCafe(dispatch);
  const updateCafe = buildUpdateCafe(dispatch);
  const deleteCafe = (id: string) => dispatch({ type: "DELETE_CAFE", id });
  const selectCafe = (cafe?: CafeLocation) =>
    dispatch({ type: "SELECT_CAFE", cafe });
  const setView = (view: ViewMode) => dispatch({ type: "SET_VIEW", view });
  const setFilters = (filters: TimelineFilters) =>
    dispatch({ type: "SET_FILTERS", filters });
  const setMapSettings = (settings: Partial<MapViewSettings>) =>
    dispatch({ type: "SET_MAP_SETTINGS", settings });
  const setLoading = (loading: boolean) =>
    dispatch({ type: "SET_LOADING", loading });
  const setError = (error?: string) => dispatch({ type: "SET_ERROR", error });

  const contextValue: AppContextType = {
    state,
    dispatch,
    addCafe,
    updateCafe,
    deleteCafe,
    selectCafe,
    setView,
    setFilters,
    setMapSettings,
    setLoading,
    setError,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
