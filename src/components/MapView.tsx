import React, { useCallback, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { useApp } from "../context/AppContext";
import { CafeLocation, Coordinates, MapViewSettings } from "../types";
import "leaflet/dist/leaflet.css";

// Fix for default markers in React-Leaflet with fallback to simple circle marker
const createMarkerIcon = () => {
  try {
    return L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  } catch {
    return L.divIcon({
      className: "custom-div-icon",
      html: '<div style="background-color: #3388ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }
};

const DefaultIcon = createMarkerIcon();
L.Marker.prototype.options.icon = DefaultIcon;

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  border: "1px solid #ddd",
  borderRadius: "4px",
};

type AddCafeFormData = {
  name: string;
  address: string;
  website?: string;
  phone?: string;
  notes?: string;
};

// ─── Map event handler ────────────────────────────────────────────────────────

interface MapEventHandlerProps {
  onMapClick: (coordinates: Coordinates) => void;
  onViewChange?: (center: Coordinates, zoom: number) => void;
}

function MapEventHandler({ onMapClick, onViewChange }: MapEventHandlerProps) {
  const map = useMapEvents({
    click: (e) =>
      onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
    moveend: () => {
      if (onViewChange) {
        const c = map.getCenter();
        onViewChange({ latitude: c.lat, longitude: c.lng }, map.getZoom());
      }
    },
    zoomend: () => {
      if (onViewChange) {
        const c = map.getCenter();
        onViewChange({ latitude: c.lat, longitude: c.lng }, map.getZoom());
      }
    },
  });
  return null;
}

// ─── Cafe popup ───────────────────────────────────────────────────────────────

function CafePopupContent({
  cafe,
  onViewDetails,
}: {
  cafe: CafeLocation;
  onViewDetails: () => void;
}) {
  return (
    <div style={{ minWidth: 200 }}>
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>{cafe.name}</h3>
      <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#666" }}>
        {cafe.address}
      </p>
      <div style={{ fontSize: "0.8rem", color: "#888" }}>
        <div>📊 {cafe.totalVisits} visits</div>
        {cafe.averageRating && <div>⭐ {cafe.averageRating.toFixed(1)}/5</div>}
        {cafe.lastVisited && (
          <div>🕒 Last: {new Date(cafe.lastVisited).toLocaleDateString()}</div>
        )}
      </div>
      <button
        onClick={onViewDetails}
        style={{
          marginTop: "0.5rem",
          padding: "0.25rem 0.5rem",
          border: "none",
          borderRadius: "4px",
          background: "#007bff",
          color: "white",
          cursor: "pointer",
          fontSize: "0.8rem",
        }}
      >
        View Details
      </button>
    </div>
  );
}

function CafeMarker({
  cafe,
  onClick,
}: {
  cafe: CafeLocation;
  onClick: (cafe: CafeLocation) => void;
}) {
  const navigate = useNavigate();
  return (
    <Marker
      position={[cafe.coordinates.latitude, cafe.coordinates.longitude]}
      eventHandlers={{ click: () => onClick(cafe) }}
    >
      <Popup>
        <CafePopupContent
          cafe={cafe}
          onViewDetails={() => navigate(`/cafe/${cafe.id}`)}
        />
      </Popup>
    </Marker>
  );
}

// ─── Map controls toolbar ─────────────────────────────────────────────────────

interface MapControlsProps {
  cafeCount: number;
  filteredCount: number;
  mapSettings: MapViewSettings;
  onSettingsChange: (s: Partial<MapViewSettings>) => void;
}

function MapControls({
  cafeCount,
  filteredCount,
  mapSettings,
  onSettingsChange,
}: MapControlsProps) {
  const checkbox = (label: string, key: keyof MapViewSettings) => (
    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <input
        type="checkbox"
        checked={mapSettings[key] as boolean}
        onChange={(e) => onSettingsChange({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  return (
    <div style={{ marginBottom: "1rem" }}>
      <h2 style={{ margin: "0 0 0.5rem 0" }}>🗺️ Map View</h2>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {checkbox("⭐ Favorites only", "showFavoritesOnly")}
        {checkbox("📍 Cluster markers", "clusterMarkers")}
        {checkbox("🔥 Visit density", "showVisitDensity")}
        <div style={{ marginLeft: "auto", fontSize: "0.9rem", color: "#666" }}>
          Showing {filteredCount} of {cafeCount} cafes • Click map to add cafe
          {cafeCount === 0 && (
            <span style={{ color: "#f57c00", marginLeft: "0.5rem" }}>
              No cafes yet - try importing data or adding manually
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Map view ─────────────────────────────────────────────────────────────────

export default function MapView() {
  const { state, selectCafe, setMapSettings, addCafe } = useApp();
  const { cafes, mapSettings } = state;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCafeCoords, setNewCafeCoords] = useState<Coordinates | null>(null);

  const handleMapClick = useCallback((coords: Coordinates) => {
    setNewCafeCoords(coords);
    setShowAddDialog(true);
  }, []);

  const filteredCafes = cafes.filter(
    (c) => !mapSettings.showFavoritesOnly || c.isFavorite,
  );

  const handleAddCafe = (cafeData: AddCafeFormData) => {
    addCafe({
      ...cafeData,
      coordinates: newCafeCoords!,
      visits: [],
      isFavorite: false,
      tags: [],
    });
    setShowAddDialog(false);
    setNewCafeCoords(null);
  };

  return (
    <div
      style={{
        height: "calc(100vh - 80px)",
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
      }}
    >
      <MapControls
        cafeCount={cafes.length}
        filteredCount={filteredCafes.length}
        mapSettings={mapSettings}
        onSettingsChange={setMapSettings}
      />
      <div
        style={{
          flex: 1,
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid #ddd",
        }}
      >
        <MapContainer
          center={[
            mapSettings.center?.latitude || 37.7749,
            mapSettings.center?.longitude || -122.4194,
          ]}
          zoom={mapSettings.zoom || 13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
          <MapEventHandler
            onMapClick={handleMapClick}
            onViewChange={(center, zoom) => setMapSettings({ center, zoom })}
          />
          {filteredCafes.map((cafe) => (
            <CafeMarker
              key={`cafe-${cafe.id}`}
              cafe={cafe}
              onClick={selectCafe}
            />
          ))}
        </MapContainer>
      </div>
      {showAddDialog && newCafeCoords && (
        <AddCafeDialog
          coordinates={newCafeCoords}
          onClose={() => {
            setShowAddDialog(false);
            setNewCafeCoords(null);
          }}
          onAdd={handleAddCafe}
        />
      )}
    </div>
  );
}

// ─── Add cafe dialog ──────────────────────────────────────────────────────────

type FormState = {
  name: string;
  address: string;
  website: string;
  phone: string;
  notes: string;
};

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label
        style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function AddCafeDialog({
  coordinates,
  onClose,
  onAdd,
}: {
  coordinates: Coordinates;
  onClose: () => void;
  onAdd: (d: AddCafeFormData) => void;
}) {
  const [form, setForm] = useState<FormState>({
    name: "",
    address: "",
    website: "",
    phone: "",
    notes: "",
  });
  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { name, address, website, phone, notes } = form;
    const addr =
      address.trim() ||
      `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    onAdd({
      name: name.trim(),
      address: addr,
      ...(website.trim() && { website: website.trim() }),
      ...(phone.trim() && { phone: phone.trim() }),
      ...(notes.trim() && { notes: notes.trim() }),
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1001,
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          minWidth: "400px",
          maxWidth: "90vw",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0" }}>Add New Cafe</h3>
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#666" }}>
          📍 {coordinates.latitude.toFixed(6)},{" "}
          {coordinates.longitude.toFixed(6)}
        </p>
        <form onSubmit={handleSubmit}>
          <FormField label="Cafe Name *">
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="Enter cafe name"
              style={inputStyle}
              required
              autoFocus
            />
          </FormField>
          <FormField label="Address">
            <input
              type="text"
              value={form.address}
              onChange={set("address")}
              placeholder="Enter address (optional)"
              style={inputStyle}
            />
          </FormField>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <FormField label="Website">
              <input
                type="url"
                value={form.website}
                onChange={set("website")}
                placeholder="https://..."
                style={inputStyle}
              />
            </FormField>
            <FormField label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="Phone number"
                style={inputStyle}
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={set("notes")}
              placeholder="Any additional notes about this cafe..."
              style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
            />
          </FormField>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "#f8f9fa",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "4px",
                background: "#007bff",
                color: "white",
                cursor: "pointer",
              }}
            >
              Add Cafe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
