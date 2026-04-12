import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import Navigation from "../Navigation";
import { AppProvider } from "../../context/AppContext";

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AppProvider>{component}</AppProvider>
    </BrowserRouter>,
  );
};

const renderWithRoute = (
  component: React.ReactElement,
  initialRoute: string,
) => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AppProvider>{component}</AppProvider>
    </MemoryRouter>,
  );
};

describe("Navigation", () => {
  it("should render the brand name", () => {
    renderWithProviders(<Navigation />);
    expect(screen.getByText("☕ Kaffeine Mapper")).toBeInTheDocument();
  });

  it("should render navigation links", () => {
    renderWithProviders(<Navigation />);
    expect(screen.getByText(/📍 Map/)).toBeInTheDocument();
    expect(screen.getByText(/📅 Timeline/)).toBeInTheDocument();
    expect(screen.getByText(/📋 List/)).toBeInTheDocument();
    expect(screen.getByText(/📥 Import/)).toBeInTheDocument();
  });

  it("should display cafe count in list navigation", () => {
    renderWithProviders(<Navigation />);
    // Should show (0) since no cafes are imported
    expect(screen.getByText(/📋 List \(0\)/)).toBeInTheDocument();
  });

  it("should apply active class to map link when on /map route", () => {
    renderWithRoute(<Navigation />, "/map");
    const mapLink = screen.getByText(/📍 Map/).closest("a");
    expect(mapLink).toHaveClass("active");
  });

  it("should not apply active class to timeline link when on /map route", () => {
    renderWithRoute(<Navigation />, "/map");
    const timelineLink = screen.getByText(/📅 Timeline/).closest("a");
    expect(timelineLink).not.toHaveClass("active");
  });

  it("should apply active class to timeline link when on /timeline route", () => {
    renderWithRoute(<Navigation />, "/timeline");
    const timelineLink = screen.getByText(/📅 Timeline/).closest("a");
    expect(timelineLink).toHaveClass("active");
  });

  it("should apply active class to list link when on /list route", () => {
    renderWithRoute(<Navigation />, "/list");
    const listLink = screen.getByText(/📋 List/).closest("a");
    expect(listLink).toHaveClass("active");
  });

  it("should apply active class to import link when on /import route", () => {
    renderWithRoute(<Navigation />, "/import");
    const importLink = screen.getByText(/📥 Import/).closest("a");
    expect(importLink).toHaveClass("active");
  });
});
