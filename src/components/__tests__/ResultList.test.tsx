import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { osm, place } from "../../test/fixtures";
import { ResultList } from "../ResultList";

describe("ResultList", () => {
  it("shows an unknown best score when no branch has one", () => {
    const branch = (id: string) => ({
      place: place({ id, osm: osm({ brand: "Tully's" }, `node/${id}`) }),
      score: { coverage: 0, metrics: {} },
    });
    render(
      <MemoryRouter>
        <ResultList
          ranked={[branch("x"), branch("y")]}
          grouped
          shown={10}
          chainCounts={new Map()}
          onDecide={jest.fn()}
          onMore={jest.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTitle("Best branch score")).toHaveTextContent("?");
  });
});
