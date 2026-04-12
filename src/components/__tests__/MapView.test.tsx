import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import MapView from "../MapView";
import { AppProvider } from "../../context/AppContext";

// Mock react-leaflet components
jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  useMapEvents: () => ({
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

// Mock leaflet to avoid icon errors
jest.mock("leaflet", () => ({
  icon: jest.fn(() => ({})),
  divIcon: jest.fn(() => ({})),
  Marker: {
    prototype: {
      options: {},
    },
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AppProvider>{component}</AppProvider>
    </BrowserRouter>,
  );
};

describe("MapView", () => {
  it("should render the map container", () => {
    renderWithProviders(<MapView />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("should render the tile layer", () => {
    renderWithProviders(<MapView />);
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
  });

  it("should render without crashing", () => {
    const { container } = renderWithProviders(<MapView />);
    expect(container).toBeInTheDocument();
  });
});
