import { render, screen } from "@testing-library/react";
import { AppProvider } from "../../context/AppContext";
import ImportView from "../ImportView";

const renderImportViewWithProvider = () => {
  return render(
    <AppProvider>
      <ImportView />
    </AppProvider>,
  );
};

describe("ImportView - Comprehensive", () => {
  it("should render the import view heading", () => {
    renderImportViewWithProvider();
    expect(
      screen.getByText(/📥 Import Google Timeline Data/i),
    ).toBeInTheDocument();
  });

  it("should display import description", () => {
    renderImportViewWithProvider();
    expect(
      screen.getByText(/Import your cafe visits from Google Timeline data/i),
    ).toBeInTheDocument();
  });

  it("should show filtering criteria", () => {
    renderImportViewWithProvider();
    expect(
      screen.getByText(/Visit duration: 15 minutes to 4 hours/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Location type: Unknown/i)).toBeInTheDocument();
    expect(screen.getByText(/High location confidence/i)).toBeInTheDocument();
  });

  it("should have instructions section", () => {
    renderImportViewWithProvider();
    expect(
      screen.getByText(/How to get your Google Timeline data/i),
    ).toBeInTheDocument();
  });

  it("should render without crashing", () => {
    const { container } = renderImportViewWithProvider();
    expect(container).toBeInTheDocument();
  });

  it("should have a file input", () => {
    const { container } = renderImportViewWithProvider();
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });
});
