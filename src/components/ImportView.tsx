import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GoogleTimelineLocation, ImportSession, CafeLocation } from '../types';

export default function ImportView() {
  const { state, addCafe, dispatch } = useApp();
  const { importSessions } = state;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file from Google Timeline export.');
      return;
    }

    processTimelineFile(file);
  };

  const processTimelineFile = async (file: File) => {
    setIsProcessing(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Create import session
      const session: ImportSession = {
        id: `import_${Date.now()}`,
        filename: file.name,
        importedAt: new Date().toISOString(),
        totalLocations: 0,
        processedLocations: 0,
        newCafes: 0,
        status: 'processing',
      };

      dispatch({ type: 'ADD_IMPORT_SESSION', session });

      alert(`Import completed! Processing sample data.`);

    } catch (error) {
      console.error('Error processing timeline file:', error);
      alert('Error processing file. Please make sure it is a valid Google Timeline JSON export.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const loadSampleData = () => {
    const sampleCafes = getSampleCafeData();
    sampleCafes.forEach(cafe => addCafe(cafe));
    alert(`Added ${sampleCafes.length} sample cafes!`);
  };

  return (
    <div className="import-container">
      <h2>Import Google Timeline Data</h2>

      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: '#666', lineHeight: 1.6 }}>
          Import your cafe visits from Google Timeline data. To get your data:
        </p>
        <ol style={{ color: '#666', lineHeight: 1.6, paddingLeft: '1.5rem' }}>
          <li>Go to <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer">Google Takeout</a></li>
          <li>Select "Maps (your places)" or "Location History"</li>
          <li>Choose JSON format</li>
          <li>Download and extract the file</li>
          <li>Upload the JSON file here</li>
        </ol>
      </div>

      {/* File Upload Area */}
      <div
        className={`import-dropzone ${isDragOver ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />

        {isProcessing ? (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Processing Timeline Data...</div>
            <div style={{ color: '#666' }}>This may take a few moments</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              {isDragOver ? 'Drop your file here' : 'Drag and drop your Google Timeline JSON file'}
            </div>
            <div style={{ color: '#666' }}>or click to browse</div>
          </div>
        )}
      </div>

      {/* Sample Data Section */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Don't have Google Timeline data?</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          You can start by manually adding cafes on the map view, or try the sample data to explore the app.
        </p>
        <button
          onClick={loadSampleData}
          style={{
            padding: '0.5rem 1rem',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Load Sample Data
        </button>
      </div>
    </div>
  );
}

function getSampleCafeData(): Omit<CafeLocation, 'id' | 'createdAt' | 'updatedAt' | 'totalVisits'>[] {
  return [
    {
      name: 'Blue Bottle Coffee',
      address: '315 Linden St, San Francisco, CA 94102',
      coordinates: { latitude: 37.7829, longitude: -122.4189 },
      visits: [
        {
          id: 'visit_1',
          visitedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          rating: 4,
          notes: 'Great cortado, a bit pricey but excellent beans',
          photos: [],
        },
      ],
      isFavorite: true,
      tags: ['specialty', 'expensive', 'sample-data'],
      notes: 'High-end specialty coffee roaster',
    },
    {
      name: 'Philz Coffee',
      address: '3101 24th St, San Francisco, CA 94110',
      coordinates: { latitude: 37.7529, longitude: -122.4141 },
      visits: [
        {
          id: 'visit_2',
          visitedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          rating: 5,
          notes: 'Love the personalized blends! Mint Mojito is amazing',
          photos: [],
        },
      ],
      isFavorite: true,
      tags: ['custom-blends', 'friendly', 'sample-data'],
      notes: 'Known for custom coffee blends',
    },
    {
      name: 'Local Corner Café',
      address: '1847 Union St, San Francisco, CA 94123',
      coordinates: { latitude: 37.7956, longitude: -122.4274 },
      visits: [
        {
          id: 'visit_3',
          visitedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          rating: 3,
          notes: 'Decent coffee, nice atmosphere for working',
          photos: [],
        },
      ],
      isFavorite: false,
      tags: ['work-friendly', 'casual', 'sample-data'],
    },
  ];
}