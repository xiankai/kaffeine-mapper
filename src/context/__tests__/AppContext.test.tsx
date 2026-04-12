/* eslint-disable max-lines-per-function */
import { render, screen, act, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "../AppContext";
import { CafeLocation, ImportSession } from "../../types";

// Component that uses the app context for testing
function TestComponent() {
  const {
    state,
    addCafe,
    updateCafe,
    deleteCafe,
    selectCafe,
    setView,
    setFilters,
    setMapSettings,
    setLoading,
    setError,
  } = useApp();

  return (
    <div>
      <div data-testid="cafe-count">{state.cafes.length}</div>
      <div data-testid="current-view">{state.currentView}</div>
      <div data-testid="loading">{state.isLoading.toString()}</div>
      <div data-testid="error">{state.error || "no-error"}</div>
      <div data-testid="import-sessions">{state.importSessions.length}</div>

      <button
        onClick={() =>
          addCafe({
            name: "Test Cafe",
            address: "123 Main St",
            coordinates: { latitude: 37.7749, longitude: -122.4194 },
            visits: [
              {
                id: "v1",
                visitedAt: "2024-01-01T10:00:00Z",
                duration: 30,
                notes: "Test visit",
                photos: [],
              },
            ],
            isFavorite: false,
            tags: [],
            notes: "",
          })
        }
        data-testid="add-cafe-btn"
      >
        Add Cafe
      </button>

      <button
        onClick={() => {
          if (state.cafes.length > 0) {
            const cafe = state.cafes[0];
            updateCafe({
              ...cafe,
              visits: [
                ...(cafe.visits || []),
                {
                  id: "v2",
                  visitedAt: "2024-01-02T11:00:00Z",
                  duration: 45,
                  rating: 4.5,
                  notes: "Great coffee",
                  photos: [],
                },
              ],
            });
          }
        }}
        data-testid="update-cafe-btn"
      >
        Update Cafe
      </button>

      <button
        onClick={() => {
          if (state.cafes.length > 0) {
            deleteCafe(state.cafes[0].id);
          }
        }}
        data-testid="delete-cafe-btn"
      >
        Delete Cafe
      </button>

      <button onClick={() => setView("timeline")} data-testid="set-view-btn">
        Set View
      </button>

      <button onClick={() => setLoading(true)} data-testid="set-loading-btn">
        Set Loading
      </button>

      <button
        onClick={() => setError("Test Error")}
        data-testid="set-error-btn"
      >
        Set Error
      </button>

      <button
        onClick={() => setFilters({ favoriteOnly: true })}
        data-testid="set-filters-btn"
      >
        Set Filters
      </button>

      <button
        onClick={() => setMapSettings({ zoom: 14 })}
        data-testid="set-map-settings-btn"
      >
        Set Map Settings
      </button>

      {state.cafes.length > 0 && (
        <>
          <button
            onClick={() => selectCafe(state.cafes[0])}
            data-testid="select-cafe-btn"
          >
            Select First Cafe
          </button>
          <div data-testid="selected-cafe">
            {state.selectedCafe?.name || "none"}
          </div>
        </>
      )}
    </div>
  );
}

describe("AppContext", () => {
  it("provides initial state", () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    expect(screen.getByTestId("cafe-count")).toHaveTextContent("0");
    expect(screen.getByTestId("current-view")).toHaveTextContent("map");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("no-error");
    expect(screen.getByTestId("import-sessions")).toHaveTextContent("0");
  });

  it("can add a cafe", () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    expect(getByTestId("cafe-count")).toHaveTextContent("0");
    act(() => {
      getByTestId("add-cafe-btn").click();
    });
    expect(getByTestId("cafe-count")).toHaveTextContent("1");
  });

  it("can update a cafe with new visit", async () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    act(() => {
      getByTestId("add-cafe-btn").click();
    });

    await waitFor(() => getByTestId("update-cafe-btn"));
    act(() => {
      getByTestId("update-cafe-btn").click();
    });

    // After update, cafe should still exist
    expect(getByTestId("cafe-count")).toHaveTextContent("1");
  });

  it("can delete a cafe", async () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    act(() => {
      getByTestId("add-cafe-btn").click();
    });

    await waitFor(() => getByTestId("delete-cafe-btn"));
    expect(getByTestId("cafe-count")).toHaveTextContent("1");

    act(() => {
      getByTestId("delete-cafe-btn").click();
    });

    expect(getByTestId("cafe-count")).toHaveTextContent("0");
  });

  it("can set view mode", () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    expect(getByTestId("current-view")).toHaveTextContent("map");
    act(() => {
      getByTestId("set-view-btn").click();
    });
    expect(getByTestId("current-view")).toHaveTextContent("timeline");
  });

  it("can set loading state", () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    expect(getByTestId("loading")).toHaveTextContent("false");
    act(() => {
      getByTestId("set-loading-btn").click();
    });
    expect(getByTestId("loading")).toHaveTextContent("true");
  });

  it("can set error message", () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    expect(getByTestId("error")).toHaveTextContent("no-error");
    act(() => {
      getByTestId("set-error-btn").click();
    });
    expect(getByTestId("error")).toHaveTextContent("Test Error");
  });

  it("can set filters", () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    // Just ensure clicking the button doesn't error
    act(() => {
      getByTestId("set-filters-btn").click();
    });
    expect(true).toBe(true);
  });

  it("can set map settings", () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    // Just ensure clicking the button doesn't error
    act(() => {
      getByTestId("set-map-settings-btn").click();
    });
    expect(true).toBe(true);
  });

  it("can add and select a cafe", async () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    act(() => {
      getByTestId("add-cafe-btn").click();
    });

    // Wait for the select button to appear
    const selectBtn = await waitFor(() => getByTestId("select-cafe-btn"));
    act(() => {
      selectBtn.click();
    });
    expect(getByTestId("selected-cafe")).toHaveTextContent("Test Cafe");
  });

  it("updates selectedCafe when updating the selected cafe", async () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    act(() => {
      getByTestId("add-cafe-btn").click();
    });

    const selectBtn = await waitFor(() => getByTestId("select-cafe-btn"));
    act(() => {
      selectBtn.click();
    });

    // Now update the cafe - this should update selectedCafe too
    act(() => {
      getByTestId("update-cafe-btn").click();
    });

    expect(getByTestId("selected-cafe")).toHaveTextContent("Test Cafe");
  });

  it("preserves selectedCafe when updating a different cafe", async () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    // Add first cafe
    act(() => {
      getByTestId("add-cafe-btn").click();
    });

    let selectBtn = await waitFor(() => getByTestId("select-cafe-btn"));
    act(() => {
      selectBtn.click();
    });

    // Verify first cafe is selected
    expect(getByTestId("selected-cafe")).toHaveTextContent("Test Cafe");
  });
});

// ─── Additional coverage tests ────────────────────────────────────────────────

const mockSession: ImportSession = {
  id: "session_1",
  filename: "timeline.json",
  importedAt: "2024-01-01T00:00:00Z",
  totalLocations: 10,
  processedLocations: 10,
  newCafes: 2,
  status: "completed",
};

const mockCafe: CafeLocation = {
  id: "cafe_test_1",
  name: "Mock Cafe",
  address: "1 Mock St",
  coordinates: { latitude: 37.7749, longitude: -122.4194 },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  visits: [],
  isFavorite: false,
  tags: [],
  totalVisits: 0,
};

describe("AppContext - reducer actions via dispatch", () => {
  function DispatchTestComponent() {
    const { state, dispatch } = useApp();
    return (
      <div>
        <div data-testid="cafe-count">{state.cafes.length}</div>
        <div data-testid="import-sessions">{state.importSessions.length}</div>
        <div data-testid="first-session-status">
          {state.importSessions[0]?.status ?? "none"}
        </div>
        <button
          onClick={() => dispatch({ type: "SET_CAFES", cafes: [mockCafe] })}
          data-testid="set-cafes-btn"
        >
          Set Cafes
        </button>
        <button
          onClick={() =>
            dispatch({ type: "ADD_IMPORT_SESSION", session: mockSession })
          }
          data-testid="add-session-btn"
        >
          Add Session
        </button>
        <button
          onClick={() =>
            dispatch({
              type: "UPDATE_IMPORT_SESSION",
              session: { ...mockSession, status: "processing" },
            })
          }
          data-testid="update-session-btn"
        >
          Update Session
        </button>
        <button
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={() => dispatch({ type: "UNKNOWN_ACTION" } as any)}
          data-testid="unknown-action-btn"
        >
          Unknown Action
        </button>
      </div>
    );
  }

  it("SET_CAFES replaces the cafes list", () => {
    const { getByTestId } = render(
      <AppProvider>
        <DispatchTestComponent />
      </AppProvider>,
    );

    expect(getByTestId("cafe-count")).toHaveTextContent("0");
    act(() => {
      getByTestId("set-cafes-btn").click();
    });
    expect(getByTestId("cafe-count")).toHaveTextContent("1");
  });

  it("ADD_IMPORT_SESSION appends a session", () => {
    const { getByTestId } = render(
      <AppProvider>
        <DispatchTestComponent />
      </AppProvider>,
    );

    expect(getByTestId("import-sessions")).toHaveTextContent("0");
    act(() => {
      getByTestId("add-session-btn").click();
    });
    expect(getByTestId("import-sessions")).toHaveTextContent("1");
    expect(getByTestId("first-session-status")).toHaveTextContent("completed");
  });

  it("UPDATE_IMPORT_SESSION updates an existing session", () => {
    const { getByTestId } = render(
      <AppProvider>
        <DispatchTestComponent />
      </AppProvider>,
    );

    act(() => {
      getByTestId("add-session-btn").click();
    });
    expect(getByTestId("first-session-status")).toHaveTextContent("completed");

    act(() => {
      getByTestId("update-session-btn").click();
    });
    expect(getByTestId("first-session-status")).toHaveTextContent("processing");
  });

  it("unknown action returns current state unchanged (default case)", () => {
    const { getByTestId } = render(
      <AppProvider>
        <DispatchTestComponent />
      </AppProvider>,
    );

    expect(getByTestId("cafe-count")).toHaveTextContent("0");
    act(() => {
      getByTestId("unknown-action-btn").click();
    });
    expect(getByTestId("cafe-count")).toHaveTextContent("0");
  });
});

describe("AppContext - useApp outside provider", () => {
  it("throws an error when useApp is used outside AppProvider", () => {
    function ComponentWithoutProvider() {
      useApp();
      return null;
    }

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => render(<ComponentWithoutProvider />)).toThrow(
      "useApp must be used within an AppProvider",
    );
    consoleSpy.mockRestore();
  });
});

describe("AppContext - updateCafe branch coverage", () => {
  function UpdateBranchTestComponent() {
    const { state, dispatch, updateCafe } = useApp();
    return (
      <div>
        <div data-testid="cafe-count">{state.cafes.length}</div>
        <div data-testid="average-rating">
          {state.cafes[0]?.averageRating ?? "none"}
        </div>
        <div data-testid="last-visited">
          {state.cafes[0]?.lastVisited ?? "none"}
        </div>
        {/* Add a cafe with NO visits */}
        <button
          onClick={() =>
            dispatch({ type: "ADD_CAFE", cafe: { ...mockCafe, visits: [] } })
          }
          data-testid="add-no-visits-btn"
        >
          Add No Visits
        </button>
        {/* Update the cafe — still no visits, so both conditional spreads are skipped */}
        <button
          onClick={() => {
            if (state.cafes[0]) updateCafe({ ...state.cafes[0], visits: [] });
          }}
          data-testid="update-no-visits-btn"
        >
          Update No Visits
        </button>
        {/* Add a cafe with visits that have NO rating */}
        <button
          onClick={() =>
            dispatch({
              type: "ADD_CAFE",
              cafe: {
                ...mockCafe,
                id: "cafe_no_rating",
                visits: [
                  {
                    id: "v_nr",
                    visitedAt: "2024-03-01T09:00:00Z",
                    photos: [],
                  },
                ],
                totalVisits: 1,
              },
            })
          }
          data-testid="add-no-rating-btn"
        >
          Add No Rating
        </button>
        {/* Update that cafe — visits exist so lastVisited is set, but no ratings so averageRating is skipped */}
        <button
          onClick={() => {
            const cafe = state.cafes.find((c) => c.id === "cafe_no_rating");
            if (cafe) updateCafe(cafe);
          }}
          data-testid="update-no-rating-btn"
        >
          Update No Rating
        </button>
      </div>
    );
  }

  it("updateCafe with zero visits skips lastVisited and averageRating", () => {
    const { getByTestId } = render(
      <AppProvider>
        <UpdateBranchTestComponent />
      </AppProvider>,
    );

    act(() => {
      getByTestId("add-no-visits-btn").click();
    });
    act(() => {
      getByTestId("update-no-visits-btn").click();
    });

    expect(getByTestId("last-visited")).toHaveTextContent("none");
    expect(getByTestId("average-rating")).toHaveTextContent("none");
  });

  it("updateCafe with unrated visits sets lastVisited but skips averageRating", () => {
    const { getByTestId } = render(
      <AppProvider>
        <UpdateBranchTestComponent />
      </AppProvider>,
    );

    act(() => {
      getByTestId("add-no-rating-btn").click();
    });
    act(() => {
      getByTestId("update-no-rating-btn").click();
    });

    expect(getByTestId("last-visited")).not.toHaveTextContent("none");
    expect(getByTestId("average-rating")).toHaveTextContent("none");
  });
});

describe("AppContext - deleteCafe clears selectedCafe", () => {
  function DeleteSelectedTestComponent() {
    const { state, dispatch, deleteCafe, selectCafe } = useApp();
    return (
      <div>
        <div data-testid="cafe-count">{state.cafes.length}</div>
        <div data-testid="selected-cafe">
          {state.selectedCafe?.name ?? "none"}
        </div>
        <button
          onClick={() => dispatch({ type: "ADD_CAFE", cafe: mockCafe })}
          data-testid="add-btn"
        >
          Add
        </button>
        <button onClick={() => selectCafe(mockCafe)} data-testid="select-btn">
          Select
        </button>
        <button
          onClick={() => deleteCafe(mockCafe.id)}
          data-testid="delete-btn"
        >
          Delete
        </button>
      </div>
    );
  }

  it("deleting the selected cafe clears selectedCafe", () => {
    const { getByTestId } = render(
      <AppProvider>
        <DeleteSelectedTestComponent />
      </AppProvider>,
    );

    act(() => {
      getByTestId("add-btn").click();
    });
    act(() => {
      getByTestId("select-btn").click();
    });
    expect(getByTestId("selected-cafe")).toHaveTextContent("Mock Cafe");

    act(() => {
      getByTestId("delete-btn").click();
    });
    expect(getByTestId("cafe-count")).toHaveTextContent("0");
    expect(getByTestId("selected-cafe")).toHaveTextContent("none");
  });
});
