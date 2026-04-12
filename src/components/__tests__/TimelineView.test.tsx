import { render, screen } from "@testing-library/react";
import TimelineView from "../TimelineView";

describe("TimelineView", () => {
  it("should render the timeline view heading", () => {
    render(<TimelineView />);
    expect(screen.getByText("📅 Timeline View")).toBeInTheDocument();
  });

  it("should display the description", () => {
    render(<TimelineView />);
    expect(
      screen.getByText("Chronological view of your cafe visits"),
    ).toBeInTheDocument();
  });

  it("should show the placeholder message", () => {
    render(<TimelineView />);
    expect(screen.getByText("🕒 Timeline Coming Soon")).toBeInTheDocument();
  });

  it("should display timeline functionality description", () => {
    render(<TimelineView />);
    expect(
      screen.getByText(
        "This will show a chronological timeline of your cafe visits",
      ),
    ).toBeInTheDocument();
  });
});
