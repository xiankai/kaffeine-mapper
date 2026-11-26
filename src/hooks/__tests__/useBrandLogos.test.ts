import { renderHook, waitFor } from "@testing-library/react";
import { loadLogo } from "../../services/brandLogos";
import { useBrandLogos } from "../useBrandLogos";

jest.mock("../../services/brandLogos", () => ({ loadLogo: jest.fn() }));

const mockLoad = loadLogo as jest.Mock;

describe("useBrandLogos", () => {
  beforeEach(() => mockLoad.mockReset());

  it("asks once per Q-id and retries only failed ones", async () => {
    mockLoad.mockImplementation(async (qid: string) =>
      qid === "Q1" ? "https://logo/1" : qid === "Q2" ? null : undefined,
    );
    const { result, rerender } = renderHook(({ qids }) => useBrandLogos(qids), {
      initialProps: { qids: ["Q2", "Q1", "Q1", "Q3"] },
    });
    await waitFor(() =>
      expect(result.current).toEqual({ Q1: "https://logo/1", Q2: null }),
    );
    expect(mockLoad).toHaveBeenCalledTimes(3);
    rerender({ qids: ["Q1"] });
    rerender({ qids: ["Q1", "Q2"] });
    expect(mockLoad).toHaveBeenCalledTimes(3);
    rerender({ qids: ["Q3"] });
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(4));
    expect(mockLoad).toHaveBeenLastCalledWith("Q3");
  });

  it("loads nothing for no Q-ids", () => {
    const { result } = renderHook(() => useBrandLogos([]));
    expect(result.current).toEqual({});
    expect(mockLoad).not.toHaveBeenCalled();
  });
});
