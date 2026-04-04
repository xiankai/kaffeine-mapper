import React, { useCallback, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { CafeLocation, Coordinates } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapEventHandlerProps {
  onMapClick: (coordinates: Coordinates) => void;
}

function MapEventHandler({ onMapClick }: MapEventHandlerProps) {
  useMapEvents({
    click: (e) => {
      onMapClick({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    },
  });
  return null;
}

interface CafeMarkerProps {
  cafe: CafeLocation;
  onClick: (cafe: CafeLocation) => void;
}

function CafeMarker({ cafe, onClick }: CafeMarkerProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    onClick(cafe);
  };

  const handleViewDetails = () => {
    navigate(`/cafe/${cafe.id}`);
  };

  return (
    <Marker
      position={[cafe.coordinates.latitude, cafe.coordinates.longitude]}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Popup>
        <div style={{ minWidth: 200 }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
            {cafe.name}
          </h3>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
            {cafe.address}
          </p>
          <div style={{ fontSize: '0.8rem', color: '#888' }}>
            <div>📊 {cafe.totalVisits} visits</div>
            {cafe.averageRating && (
              <div>⭐ {cafe.averageRating.toFixed(1)}/5</div>
            )}
            {cafe.lastVisited && (
              <div>🕒 Last: {new Date(cafe.lastVisited).toLocaleDateString()}</div>
            )}
          </div>
          <button
            onClick={handleViewDetails}
            style={{
              marginTop: '0.5rem',
              padding: '0.25rem 0.5rem',
              border: 'none',
              borderRadius: '4px',
              background: '#007bff',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView() {
  const { state, selectCafe, setMapSettings, addCafe } = useApp();
  const { cafes, mapSettings, selectedCafe } = state;
  const [showAddCafeDialog, setShowAddCafeDialog] = useState(false);
  const [newCafeCoords, setNewCafeCoords] = useState<Coordinates | null>(null);

  const handleMapClick = useCallback((coordinates: Coordinates) => {
    setNewCafeCoords(coordinates);
    setShowAddCafeDialog(true);
  }, []);

  const handleCafeClick = useCallback((cafe: CafeLocation) => {
    selectCafe(cafe);
  }, [selectCafe]);

  const handleMapSettingsChange = (setting: string, value: any) => {
    setMapSettings({ [setting]: value });
  };

  const filteredCafes = cafes.filter(cafe =>
    !mapSettings.showFavoritesOnly || cafe.isFavorite
  );

  return (
    <div style={{
      height: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>🗺️ Map View</h2>

        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={mapSettings.showFavoritesOnly}
              onChange={(e) => handleMapSettingsChange('showFavoritesOnly', e.target.checked)}
            />
            ⭐ Favorites only
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={mapSettings.clusterMarkers}
              onChange={(e) => handleMapSettingsChange('clusterMarkers', e.target.checked)}
            />
            📍 Cluster markers
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={mapSettings.showVisitDensity}
              onChange={(e) => handleMapSettingsChange('showVisitDensity', e.target.checked)}
            />
            🔥 Visit density
          </label>

          <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#666' }}>
            Showing {filteredCafes.length} of {cafes.length} cafes • Click map to add cafe
          </div>
        </div>
      </div>

      <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
        <MapContainer
          center={[
            mapSettings.center?.latitude || 37.7749,
            mapSettings.center?.longitude || -122.4194,
          ]}
          zoom={mapSettings.zoom || 13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEventHandler onMapClick={handleMapClick} />

          {filteredCafes.map(cafe => (
            <CafeMarker
              key={cafe.id}
              cafe={cafe}
              onClick={handleCafeClick}
            />
          ))}
        </MapContainer>
      </div>

      {showAddCafeDialog && newCafeCoords && (
        <AddCafeDialog
          coordinates={newCafeCoords}
          onClose={() => {
            setShowAddCafeDialog(false);
            setNewCafeCoords(null);
          }}
          onAdd={(cafeData) => {
            const newCafe: Omit<CafeLocation, 'id' | 'createdAt' | 'updatedAt' | 'totalVisits' | 'lastVisited' | 'averageRating'> = {
              ...cafeData,
              coordinates: newCafeCoords,
              visits: [],
              isFavorite: false,
              tags: [],
            };
            addCafe(newCafe);
            setShowAddCafeDialog(false);
            setNewCafeCoords(null);
          }}
        />
      )}
    </div>
  );
}

interface AddCafeDialogProps {
  coordinates: Coordinates;
  onClose: () => void;
  onAdd: (cafeData: { name: string; address: string; website?: string; phone?: string; notes?: string }) => void;
}

function AddCafeDialog({ coordinates, onClose, onAdd }: AddCafeDialogProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd({
        name: name.trim(),
        address: address.trim() || `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`,
        website: website.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001,
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: '400px',
        maxWidth: '90vw',
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Add New Cafe</h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#666' }}>
          📍 {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Cafe Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter cafe name"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address (optional)"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this cafe..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: '#f8f9fa',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                background: '#007bff',
                color: 'white',
                cursor: 'pointer',
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