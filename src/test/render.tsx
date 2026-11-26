import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DEFAULT_PREFERENCES } from "../domain/scoring";
import { Dataset, Place } from "../domain/types";
import { EnrichmentProvider } from "../state/enrichment";
import { StoreProvider } from "../state/store";

export function renderWithStore(
  ui: ReactElement,
  {
    places = [] as Place[],
    chains = undefined as Dataset["chains"],
    path = "/",
    route = "/",
  } = {},
) {
  return render(
    <StoreProvider
      initial={{
        dataset: { version: 1, places, ...(chains && { chains }) },
        preferences: DEFAULT_PREFERENCES,
      }}
    >
      <EnrichmentProvider refreshOnOpen={false}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<p>elsewhere</p>} />
          </Routes>
        </MemoryRouter>
      </EnrichmentProvider>
    </StoreProvider>,
  );
}
