import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DEFAULT_PREFERENCES } from "../domain/scoring";
import { Place } from "../domain/types";
import { StoreProvider } from "../state/store";

export function renderWithStore(
  ui: ReactElement,
  { places = [] as Place[], path = "/", route = "/" } = {},
) {
  return render(
    <StoreProvider
      initial={{
        dataset: { version: 1, places },
        preferences: DEFAULT_PREFERENCES,
      }}
    >
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
}
