import { render, screen } from "@testing-library/react";
import ListView from "../ListView";

describe("ListView", () => {
  it("should render the list view heading", () => {
    render(<ListView />);
    expect(screen.getByText("📋 List View")).toBeInTheDocument();
  });

  it("should display the description", () => {
    render(<ListView />);
    expect(
      screen.getByText("Browse all your cafes in a sortable list"),
    ).toBeInTheDocument();
  });

  it("should show the placeholder message", () => {
    render(<ListView />);
    expect(screen.getByText("📊 Cafe List Coming Soon")).toBeInTheDocument();
  });

  it("should display list functionality description", () => {
    render(<ListView />);
    expect(
      screen.getByText(
        "This will show a sortable and filterable list of all your cafes",
      ),
    ).toBeInTheDocument();
  });
});
