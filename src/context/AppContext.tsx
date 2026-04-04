import React, { createContext, useContext, useReducer, useState } from 'react';
import { CafeLocation, ViewMode, TimelineFilters, MapViewSettings, ImportSession } from '../types';

interface AppState {
  cafes: CafeLocation[];
  selectedCafe?: CafeLocation;
  currentView: ViewMode;
  filters: TimelineFilters;
  mapSettings: MapViewSettings;
  isLoading: boolean;
  error?: string;
  importSessions: ImportSession[];
}

type AppAction =
  | { type: 'SET_CAFES'; cafes: CafeLocation[] }
  | { type: 'ADD_CAFE'; cafe: CafeLocation }
  | { type: 'UPDATE_CAFE'; cafe: CafeLocation }
  | { type: 'DELETE_CAFE'; id: string }
  | { type: 'SELECT_CAFE'; cafe?: CafeLocation }
  | { type: 'SET_VIEW'; view: ViewMode }
  | { type: 'SET_FILTERS'; filters: TimelineFilters }
  | { type: 'SET_MAP_SETTINGS'; settings: MapViewSettings }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error?: string }
  | { type: 'ADD_IMPORT_SESSION'; session: ImportSession }
  | { type: 'UPDATE_IMPORT_SESSION'; session: ImportSession };

const initialState: AppState = {
  cafes: [],
  currentView: 'map',
  filters: {},
  mapSettings: {
    center: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco default
    zoom: 13,
    showVisitDensity: false,
    showFavoritesOnly: false,
    clusterMarkers: true,
  },
  isLoading: false,
  importSessions: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CAFES':
      return { ...state, cafes: action.cafes };

    case 'ADD_CAFE':
      return { ...state, cafes: [...state.cafes, action.cafe] };

    case 'UPDATE_CAFE':
      return {
        ...state,
        cafes: state.cafes.map(cafe =>
          cafe.id === action.cafe.id ? action.cafe : cafe
        ),
        selectedCafe: state.selectedCafe?.id === action.cafe.id
          ? action.cafe
          : state.selectedCafe,
      };

    case 'DELETE_CAFE':
      return {
        ...state,
        cafes: state.cafes.filter(cafe => cafe.id !== action.id),
        selectedCafe: state.selectedCafe?.id === action.id
          ? undefined
          : state.selectedCafe,
      };

    case 'SELECT_CAFE':
      return { ...state, selectedCafe: action.cafe };

    case 'SET_VIEW':
      return { ...state, currentView: action.view };

    case 'SET_FILTERS':
      return { ...state, filters: action.filters };

    case 'SET_MAP_SETTINGS':
      return { ...state, mapSettings: { ...state.mapSettings, ...action.settings } };

    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'ADD_IMPORT_SESSION':
      return { ...state, importSessions: [...state.importSessions, action.session] };

    case 'UPDATE_IMPORT_SESSION':
      return {
        ...state,
        importSessions: state.importSessions.map(session =>
          session.id === action.session.id ? action.session : session
        ),
      };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;

  // Convenience methods
  addCafe: (cafe: Omit<CafeLocation, 'id' | 'createdAt' | 'updatedAt' | 'totalVisits'>) => void;
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Convenience methods
  const addCafe = (cafeData: Omit<CafeLocation, 'id' | 'createdAt' | 'updatedAt' | 'totalVisits'>) => {
    const cafe: CafeLocation = {
      ...cafeData,
      id: `cafe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalVisits: cafeData.visits.length,
    };
    dispatch({ type: 'ADD_CAFE', cafe });
  };

  const updateCafe = (cafe: CafeLocation) => {
    const updatedCafe = {
      ...cafe,
      updatedAt: new Date().toISOString(),
      totalVisits: cafe.visits.length,
      lastVisited: cafe.visits.length > 0
        ? cafe.visits.reduce((latest, visit) =>
            visit.visitedAt > latest ? visit.visitedAt : latest,
            cafe.visits[0].visitedAt
          )
        : undefined,
      averageRating: cafe.visits.length > 0
        ? cafe.visits
            .filter(visit => visit.rating)
            .reduce((sum, visit, _, filtered) =>
              sum + (visit.rating! / filtered.length), 0
            )
        : undefined,
    };
    dispatch({ type: 'UPDATE_CAFE', cafe: updatedCafe });
  };

  const deleteCafe = (id: string) => dispatch({ type: 'DELETE_CAFE', id });
  const selectCafe = (cafe?: CafeLocation) => dispatch({ type: 'SELECT_CAFE', cafe });
  const setView = (view: ViewMode) => dispatch({ type: 'SET_VIEW', view });
  const setFilters = (filters: TimelineFilters) => dispatch({ type: 'SET_FILTERS', filters });
  const setMapSettings = (settings: Partial<MapViewSettings>) =>
    dispatch({ type: 'SET_MAP_SETTINGS', settings });
  const setLoading = (loading: boolean) => dispatch({ type: 'SET_LOADING', loading });
  const setError = (error?: string) => dispatch({ type: 'SET_ERROR', error });

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
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}