import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navigation from './components/Navigation';
import MapView from './components/MapView';
import TimelineView from './components/TimelineView';
import ListView from './components/ListView';
import CafeDetails from './components/CafeDetails';
import ImportView from './components/ImportView';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="app">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/map" replace />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/timeline" element={<TimelineView />} />
              <Route path="/list" element={<ListView />} />
              <Route path="/cafe/:id" element={<CafeDetails />} />
              <Route path="/import" element={<ImportView />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;