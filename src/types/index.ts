/**
 * Core TypeScript types for the Kaffeine Mapper application
 */

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // in meters
}

/**
 * Photo metadata and information
 */
export interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  takenAt: string; // ISO 8601 date string
  coordinates?: Coordinates;
  fileSize?: number; // in bytes
  mimeType?: string;
}

/**
 * Visit information for a cafe location
 */
export interface CafeVisit {
  id: string;
  visitedAt: string; // ISO 8601 date string
  duration?: number; // minutes spent at location
  rating?: number; // 1-5 star rating
  notes?: string;
  photos: Photo[];
  mood?: "great" | "good" | "okay" | "poor";
  withCompany?: string[]; // names of people visited with
}

/**
 * Core cafe location data
 */
export interface CafeLocation {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  createdAt: string;
  updatedAt: string;

  // Business information
  website?: string;
  phone?: string;
  hours?: Record<string, string>; // day -> hours format
  priceRange?: "$" | "$$" | "$$$" | "$$$$";

  // User data
  visits: CafeVisit[];
  isFavorite: boolean;
  tags: string[];
  notes?: string;

  // Derived fields
  totalVisits: number;
  lastVisited?: string;
  averageRating?: number;
}

/**
 * Google Timeline location data structure
 * Based on Google Takeout timeline format
 */
export interface GoogleTimelineLocation {
  timestampMs: string;
  latitudeE7: number; // latitude * 10^7
  longitudeE7: number; // longitude * 10^7
  accuracy: number;
  activity?: Array<{
    activityType: string;
    probability: number;
  }>;
  placeId?: string;
  name?: string;
  address?: string;
}

/**
 * Import session tracking
 */
export interface ImportSession {
  id: string;
  filename: string;
  importedAt: string;
  totalLocations: number;
  processedLocations: number;
  newCafes: number;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
}

/**
 * Application view mode
 */
export type ViewMode = "map" | "timeline" | "list" | "details";

/**
 * Timeline filter options
 */
export interface TimelineFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  rating?: number;
  favoriteOnly?: boolean;
}

/**
 * Map view settings
 */
export interface MapViewSettings {
  center?: Coordinates;
  zoom?: number;
  showVisitDensity?: boolean;
  showFavoritesOnly?: boolean;
  clusterMarkers?: boolean;
}

/**
 * Application state shape
 */
export interface AppState {
  cafes: CafeLocation[];
  selectedCafe?: CafeLocation;
  currentView: ViewMode;
  filters: TimelineFilters;
  mapSettings: MapViewSettings;
  isLoading: boolean;
  error?: string;
}
