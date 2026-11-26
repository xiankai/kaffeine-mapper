import { renderHook, waitFor } from "@testing-library/react";
import { loadLogo } from "../../services/brandLogos";
import { useBrandLogos } from "../useBrandLogos";

jest.mock("../../services/brandLogos", () => ({ loadLogo: jest.fn() }));

const mockLoad = loadLogo as jest.Mock;

describe("useBrandLogos", () => {
  beforeEach(() => mockLoad.mockReset());

  it("loads each Q-id once and keeps known answers", async () => {
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
    const before = result.current;
    rerender({ qids: ["Q1", "Q2", "Q3"] });
    expect(result.current).toBe(before);
    expect(mockLoad).toHaveBeenCalledTimes(3);
    rerender({ qids: ["Q1"] });
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(4));
    expect(result.current).toBe(before);
  });

  it("ignores answers after unmount and loads nothing for no Q-ids", async () => {
    let finish: (logo: string) => void = () => undefined;
    mockLoad.mockReturnValue(
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    );
    const { result, unmount } = renderHook(() => useBrandLogos(["Q1"]));
    unmount();
    finish("https://logo/1");
    await Promise.resolve();
    expect(result.current).toEqual({});
    renderHook(() => useBrandLogos([]));
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
