import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CafeDetails from "../CafeDetails";

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("CafeDetails", () => {
  it("should render the cafe details heading", () => {
    renderWithRouter(<CafeDetails />);
    expect(screen.getByText("☕ Cafe Details")).toBeInTheDocument();
  });

  it("should display the placeholder message", () => {
    renderWithRouter(<CafeDetails />);
    expect(screen.getByText("🏪 Cafe Details Coming Soon")).toBeInTheDocument();
  });

  it("should show description text", () => {
    renderWithRouter(<CafeDetails />);
    expect(
      screen.getByText(
        "This will show detailed information, photos, and visit history",
      ),
    ).toBeInTheDocument();
  });
});
