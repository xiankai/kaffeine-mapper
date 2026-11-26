import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_FILTERS, Filters } from "../../domain/filters";
import { FilterBar } from "../FilterBar";

function setup(filters: Filters = DEFAULT_FILTERS) {
  const onChange = jest.fn();
  render(
    <FilterBar
      filters={filters}
      count={3}
      onChange={onChange}
      now={() => new Date(2024, 0, 6, 9, 5)}
    />,
  );
  return onChange;
}

describe("FilterBar", () => {
  it("updates selects and search", () => {
    const onChange = setup();
    fireEvent.change(screen.getByLabelText("Show"), {
      target: { value: "to-try" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "to-try" }),
    );
    fireEvent.change(screen.getByLabelText("Places"), {
      target: { value: "all" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ review: "all" }),
    );
    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "name" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "name" }),
    );
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "kiln" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "kiln" }),
    );
    expect(screen.getByText("3 places")).toBeInTheDocument();
  });

  it("toggles requirement chips", () => {
    const onChange = setup();
    for (const [name, key] of [
      ["🔌 Sockets", "sockets"],
      ["📶 Wi-Fi", "wifi"],
      ["Open weekends", "weekend"],
      ["Independent", "independent"],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ [key]: true }),
      );
    }
  });

  it("sets open-at to now and lets the day and time change, then clears it", () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole("button", { name: /Open at/ }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ openAt: { day: 6, minute: 545 } }),
    );
  });

  it("edits and clears an existing open-at", () => {
    const onChange = setup({
      ...DEFAULT_FILTERS,
      openAt: { day: 1, minute: 600 },
    });
    expect(screen.getByLabelText("Time")).toHaveValue("10:00");
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "3" } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ openAt: { day: 3, minute: 600 } }),
    );
    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: "18:30" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ openAt: { day: 1, minute: 1110 } }),
    );
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ openAt: { day: 1, minute: 0 } }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Open at/ }));
    expect(onChange.mock.lastCall[0].openAt).toBeUndefined();
  });

  it("never submits the form", () => {
    setup();
    const event = new Event("submit", { bubbles: true, cancelable: true });
    screen.getByRole("form", { name: "Filters" }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("uses the real clock by default", () => {
    const onChange = jest.fn();
    render(
      <FilterBar filters={DEFAULT_FILTERS} count={0} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Open at/ }));
    expect(onChange.mock.lastCall[0].openAt.day).toBe(new Date().getDay());
  });
});

describe("FilterBar review queue", () => {
  it("sorts the review queue by visits and offers short one-off visits", () => {
    const onChange = setup();
    fireEvent.change(screen.getByLabelText("Places"), {
      target: { value: "pending" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ review: "pending", sort: "visits" }),
    );
    expect(
      screen.queryByLabelText("Include short one-off visits"),
    ).not.toBeInTheDocument();
  });

  it("toggles short one-off visits and chain grouping", () => {
    const onChange = setup({ ...DEFAULT_FILTERS, review: "pending" });
    fireEvent.click(screen.getByLabelText("Include short one-off visits"));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ shortVisits: true }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Group chains" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ groupChains: true }),
    );
  });
});
