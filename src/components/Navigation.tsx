import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Navigation() {
  const { state } = useApp();
  const { cafes } = state;

  return (
    <nav className="navigation">
      <h1 className="nav-brand">☕ Kaffeine Mapper</h1>

      <ul className="nav-links">
        <li>
          <NavLink
            to="/map"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            📍 Map
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/timeline"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            📅 Timeline
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/list"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            📋 List ({cafes.length})
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/import"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            📥 Import
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
