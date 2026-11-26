import { place } from "../../test/fixtures";
import {
  appendEvaluation,
  confirmedAt,
  editManual,
  evaluationFromEdit,
  evaluationNotes,
  foldEvaluation,
  isEmptyEvaluation,
  recordEvaluation,
  relativeDate,
} from "../evaluations";

const AT = "2026-11-26T05:00:00.000Z";
const later = (minutes: number) =>
  new Date(Date.parse(AT) + minutes * 60000).toISOString();

describe("foldEvaluation", () => {
  it("copies defined fields into the snapshot and merges seats per slot", () => {
    expect(
      foldEvaluation(
        {
          sockets: "few",
          wifi: "ok",
          notes: "kept",
          seats: { "weekday-morning": "easy" },
        },
        {
          at: AT,
          sockets: "many",
          wifiLimitMinutes: null,
          seats: { "weekday-evening": "hard" },
          note: "busy today",
        },
      ),
    ).toEqual({
      sockets: "many",
      wifi: "ok",
      wifiLimitMinutes: null,
      notes: "kept",
      seats: { "weekday-morning": "easy", "weekday-evening": "hard" },
    });
  });
});

describe("isEmptyEvaluation", () => {
  it("treats a bare timestamp as empty and a note alone as content", () => {
    expect(isEmptyEvaluation({ at: AT })).toBe(true);
    expect(isEmptyEvaluation({ at: AT, note: "" })).toBe(true);
    expect(isEmptyEvaluation({ at: AT, note: "nice" })).toBe(false);
    expect(isEmptyEvaluation({ at: AT, wifiLimitMinutes: null })).toBe(false);
  });
});

describe("appendEvaluation", () => {
  it("folds an edit within half an hour into the newest evaluation", () => {
    const first = {
      at: AT,
      sockets: "few" as const,
      seats: { "weekday-morning": "ok" as const },
    };
    const merged = appendEvaluation([first], {
      at: later(10),
      wifi: "strong",
      seats: { "weekday-evening": "hard" },
    });
    expect(merged).toEqual([
      {
        at: later(10),
        sockets: "few",
        wifi: "strong",
        seats: { "weekday-morning": "ok", "weekday-evening": "hard" },
      },
    ]);
    expect(
      appendEvaluation([first], { at: later(45), wifi: "ok" }),
    ).toHaveLength(2);
    expect(appendEvaluation([], { at: AT, wifi: "ok" })).toHaveLength(1);
    expect(
      appendEvaluation([{ at: later(10), rating: 3 }], { at: AT, rating: 4 }),
    ).toHaveLength(2);
  });
});

describe("recordEvaluation", () => {
  it("appends and updates the snapshot, and skips an empty sheet", () => {
    const base = place({ manual: { notes: "mine" } });
    const recorded = recordEvaluation(base, { at: AT, rating: 4 });
    expect(recorded.manual).toEqual({ notes: "mine", rating: 4 });
    expect(recorded.evaluations).toEqual([{ at: AT, rating: 4 }]);
    expect(recordEvaluation(base, { at: AT })).toBe(base);
  });
});

describe("evaluationFromEdit", () => {
  it("keeps only fields and slots that changed to a value", () => {
    expect(
      evaluationFromEdit(
        { sockets: "few", wifi: "ok", seats: { "weekday-morning": "easy" } },
        {
          sockets: "many",
          seats: { "weekday-morning": "easy", "weekend-evening": "hard" },
          notes: "x",
        },
        AT,
      ),
    ).toEqual({
      at: AT,
      sockets: "many",
      seats: { "weekend-evening": "hard" },
    });
  });
});

describe("editManual", () => {
  it("records a dated evaluation for an attribute edit", () => {
    const edited = editManual(
      place({ manual: {} }),
      { wifi: "weak" },
      new Date(AT),
    );
    expect(edited.manual).toEqual({ wifi: "weak" });
    expect(edited.evaluations).toEqual([{ at: AT, wifi: "weak" }]);
  });

  it("only updates the snapshot for notes or clearing a field", () => {
    const base = place({ manual: { wifi: "weak" } });
    const edited = editManual(base, { notes: "quiet" }, new Date(AT));
    expect(edited.manual).toEqual({ notes: "quiet" });
    expect(edited.evaluations).toBeUndefined();
  });
});

describe("confirmedAt", () => {
  it("dates each current attribute from the newest evaluation that set it", () => {
    const confirmed = confirmedAt(
      place({
        manual: {
          sockets: "many",
          rating: 4,
          seats: { "weekday-morning": "easy" },
        },
        evaluations: [
          { at: AT, sockets: "few", wifi: "ok", rating: 4 },
          { at: later(60 * 24), sockets: "many" },
          { at: later(60), seats: { "weekday-morning": "easy" } },
        ],
      }),
    );
    expect(confirmed).toEqual({
      sockets: later(60 * 24),
      rating: AT,
      "weekday-morning": later(60),
    });
    expect(confirmedAt(place())).toEqual({});
  });
});

describe("relativeDate", () => {
  const now = new Date(2026, 10, 26, 9, 0);
  const daysAgo = (n: number) =>
    new Date(2026, 10, 26 - n, 20, 0).toISOString();
  it("reads as calendar days, months and years", () => {
    expect(relativeDate(daysAgo(0), now)).toBe("today");
    expect(relativeDate(new Date(2026, 10, 27).toISOString(), now)).toBe(
      "today",
    );
    expect(relativeDate(daysAgo(1), now)).toBe("yesterday");
    expect(relativeDate(daysAgo(5), now)).toBe("5 days ago");
    expect(relativeDate(daysAgo(35), now)).toBe("1 month ago");
    expect(relativeDate(daysAgo(200), now)).toBe("6 months ago");
    expect(relativeDate(daysAgo(800), now)).toBe("2 years ago");
  });
});

describe("evaluationNotes", () => {
  it("lists notes newest first", () => {
    expect(
      evaluationNotes(
        place({
          evaluations: [
            { at: AT, note: "old" },
            { at: later(60), rating: 3 },
            { at: later(120), note: "new" },
          ],
        }),
      ).map((e) => e.note),
    ).toEqual(["new", "old"]);
    expect(evaluationNotes(place())).toEqual([]);
  });
});
