import { fireEvent, screen } from "@testing-library/react";
import { renderWithStore } from "../../test/render";
import { PreferencesPage } from "../PreferencesPage";

jest.mock("../../services/storage", () => ({
  savePreferences: jest.fn(async () => undefined),
  saveDataset: jest.fn(async () => undefined),
}));

describe("PreferencesPage", () => {
  it("edits slots, chain preference and weights, and resets", () => {
    renderWithStore(<PreferencesPage />);
    const evening = screen.getByRole("button", { name: "weekday evening" });
    expect(evening).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(evening);
    expect(evening).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "weekday morning" }));
    expect(
      screen.getByRole("button", { name: "weekday morning" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByLabelText("Chain preference"), {
      target: { value: "neutral" },
    });
    expect(screen.getByLabelText("Chain preference")).toHaveValue("neutral");
    const sockets = screen.getByRole("slider", { name: /Power sockets/ });
    fireEvent.change(sockets, { target: { value: "5" } });
    expect(sockets).toHaveValue("5");
    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(sockets).toHaveValue("3");
    expect(evening).toHaveAttribute("aria-pressed", "true");
  });
});
