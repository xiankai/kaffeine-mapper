import { HashRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { ExplorePage } from "./components/ExplorePage";
import { ImportPage } from "./components/ImportPage";
import { PlaceDetail } from "./components/PlaceDetail";
import { PreferencesPage } from "./components/PreferencesPage";
import { StoreProvider, useStore } from "./state/store";
import "./App.css";

function Shell() {
  const { ready, dataset } = useStore();
  if (!ready) return <p className="empty">Loading your cafés…</p>;
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={dataset.places.length ? "/explore" : "/import"}
            replace
          />
        }
      />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/place/:id" element={<PlaceDetail />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/preferences" element={<PreferencesPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <header className="topbar">
          <span className="brand">☕ Kaffeine Mapper</span>
          <nav aria-label="Main">
            <NavLink to="/explore">Explore</NavLink>
            <NavLink to="/import">Import</NavLink>
            <NavLink to="/preferences">Scoring</NavLink>
          </nav>
        </header>
        <main className="page">
          <Shell />
        </main>
      </HashRouter>
    </StoreProvider>
  );
}
