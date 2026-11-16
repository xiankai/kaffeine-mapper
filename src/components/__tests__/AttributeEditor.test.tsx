import { fireEvent, render, screen } from "@testing-library/react";
import { ManualAttributes } from "../../domain/types";
import { AttributeEditor } from "../AttributeEditor";

function setup(manual: ManualAttributes = {}) {
  const onChange = jest.fn();
  render(<AttributeEditor manual={manual} onChange={onChange} />);
  return onChange;
}

const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("AttributeEditor", () => {
  it("sets each attribute", () => {
    const onChange = setup();
    change("Power sockets", "few");
    expect(onChange).toHaveBeenLastCalledWith({ sockets: "few" });
    change("Wi-Fi strength", "strong");
    expect(onChange).toHaveBeenLastCalledWith({ wifi: "strong" });
    change("Wi-Fi time limit", "none");
    expect(onChange).toHaveBeenLastCalledWith({ wifiLimitMinutes: null });
    change("Wi-Fi time limit", "120");
    expect(onChange).toHaveBeenLastCalledWith({ wifiLimitMinutes: 120 });
    change("Chain?", "chain");
    expect(onChange).toHaveBeenLastCalledWith({ chain: true });
    change("Chain?", "independent");
    expect(onChange).toHaveBeenLastCalledWith({ chain: false });
    change("My rating", "4");
    expect(onChange).toHaveBeenLastCalledWith({ rating: 4 });
    change("weekend morning", "hard");
    expect(onChange).toHaveBeenLastCalledWith({
      seats: { "weekend-morning": "hard" },
    });
    change("Notes", "quiet upstairs");
    expect(onChange).toHaveBeenLastCalledWith({ notes: "quiet upstairs" });
  });

  it("shows and clears existing values", () => {
    const manual: ManualAttributes = {
      sockets: "many",
      wifiLimitMinutes: null,
      chain: true,
      rating: 5,
      seats: { "weekday-evening": "easy", "weekend-evening": "ok" },
      notes: "n",
    };
    const onChange = setup(manual);
    expect(screen.getByLabelText("Wi-Fi time limit")).toHaveValue("none");
    expect(screen.getByLabelText("Chain?")).toHaveValue("chain");
    expect(screen.getByLabelText("My rating")).toHaveValue("5");
    change("Power sockets", "");
    expect(onChange.mock.lastCall[0]).not.toHaveProperty("sockets");
    change("Wi-Fi time limit", "");
    expect(onChange.mock.lastCall[0]).not.toHaveProperty("wifiLimitMinutes");
    change("Chain?", "");
    expect(onChange.mock.lastCall[0]).not.toHaveProperty("chain");
    change("My rating", "");
    expect(onChange.mock.lastCall[0]).not.toHaveProperty("rating");
    change("weekday evening", "");
    expect(onChange.mock.lastCall[0].seats).toEqual({
      "weekend-evening": "ok",
    });
    change("Notes", "");
    expect(onChange.mock.lastCall[0]).not.toHaveProperty("notes");
  });

  it("never submits the form", () => {
    setup();
    const event = new Event("submit", { bubbles: true, cancelable: true });
    screen.getByLabelText("Notes").closest("form")?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("drops the seats object when the last slot is cleared", () => {
    const onChange = setup({ seats: { "weekday-morning": "ok" } });
    change("weekday morning", "");
    expect(onChange).toHaveBeenLastCalledWith({});
  });
});
