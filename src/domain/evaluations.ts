import {
  Assessed,
  Evaluation,
  ManualAttributes,
  Place,
  Slot,
  SLOTS,
} from "./types";

export type EvaluatedField = "sockets" | "wifi" | "wifiLimitMinutes" | "rating";
export type ConfirmKey = EvaluatedField | Slot;

export const EVALUATED_FIELDS: readonly EvaluatedField[] = [
  "sockets",
  "wifi",
  "wifiLimitMinutes",
  "rating",
];
const COALESCE_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Attributes = Pick<ManualAttributes, EvaluatedField | "seats">;

function definedKeys(attributes: Attributes): ConfirmKey[] {
  const fields = EVALUATED_FIELDS.filter((f) => attributes[f] !== undefined);
  const slots = SLOTS.filter((s) => attributes.seats?.[s] !== undefined);
  return [...fields, ...slots];
}

export function isEmptyEvaluation(evaluation: Evaluation): boolean {
  return definedKeys(evaluation).length === 0 && !evaluation.note;
}

function mergeSeats(older: Attributes, newer: Attributes): Attributes {
  return older.seats || newer.seats
    ? { seats: { ...older.seats, ...newer.seats } }
    : {};
}

function definedFields(evaluation: Evaluation): Partial<ManualAttributes> {
  return Object.fromEntries(
    EVALUATED_FIELDS.filter((f) => evaluation[f] !== undefined).map((f) => [
      f,
      evaluation[f],
    ]),
  );
}

export function foldEvaluation(
  manual: ManualAttributes,
  evaluation: Evaluation,
): ManualAttributes {
  return {
    ...manual,
    ...definedFields(evaluation),
    ...mergeSeats(manual, evaluation),
  };
}

function combine(older: Evaluation, newer: Evaluation): Evaluation {
  return { ...older, ...newer, ...mergeSeats(older, newer) };
}

export function appendEvaluation(
  evaluations: Evaluation[],
  evaluation: Evaluation,
): Evaluation[] {
  const last = evaluations.at(-1);
  const gap = last ? Date.parse(evaluation.at) - Date.parse(last.at) : NaN;
  if (!last || !(gap >= 0 && gap <= COALESCE_MS))
    return [...evaluations, evaluation];
  return [...evaluations.slice(0, -1), combine(last, evaluation)];
}

export function recordEvaluation(place: Place, evaluation: Evaluation): Place {
  if (isEmptyEvaluation(evaluation)) return place;
  return {
    ...place,
    manual: foldEvaluation(place.manual, evaluation),
    evaluations: appendEvaluation(place.evaluations ?? [], evaluation),
  };
}

function changedSeats(
  before: ManualAttributes,
  after: ManualAttributes,
): Pick<Evaluation, "seats"> {
  const seats = Object.fromEntries(
    SLOTS.filter(
      (s) => after.seats?.[s] && after.seats[s] !== before.seats?.[s],
    ).map((s) => [s, after.seats?.[s]]),
  );
  return Object.keys(seats).length ? { seats } : {};
}

export function evaluationFromEdit(
  before: ManualAttributes,
  after: ManualAttributes,
  at: string,
): Evaluation {
  const changed = EVALUATED_FIELDS.filter(
    (f) => after[f] !== undefined && after[f] !== before[f],
  );
  return {
    at,
    ...Object.fromEntries(changed.map((f) => [f, after[f]])),
    ...changedSeats(before, after),
  };
}

export function editManual<T extends Assessed>(
  target: T,
  manual: ManualAttributes,
  now: Date,
): T {
  const evaluation = evaluationFromEdit(
    target.manual,
    manual,
    now.toISOString(),
  );
  if (isEmptyEvaluation(evaluation)) return { ...target, manual };
  return {
    ...target,
    manual,
    evaluations: appendEvaluation(target.evaluations ?? [], evaluation),
  };
}

export function confirmedAt(
  target: Assessed,
): Partial<Record<ConfirmKey, string>> {
  const current = new Set(definedKeys(target.manual));
  const latest: Partial<Record<ConfirmKey, string>> = {};
  for (const evaluation of target.evaluations ?? []) {
    for (const key of definedKeys(evaluation)) {
      const seen = latest[key];
      if (current.has(key) && (!seen || evaluation.at > seen))
        latest[key] = evaluation.at;
    }
  }
  return latest;
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const ago = (n: number, unit: string) =>
  `${n} ${unit}${n === 1 ? "" : "s"} ago`;

export function relativeDate(at: string, now: Date): string {
  const days = Math.max(
    0,
    Math.round((startOfDay(now) - startOfDay(new Date(at))) / DAY_MS),
  );
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return ago(days, "day");
  if (days < 365) return ago(Math.floor(days / 30), "month");
  return ago(Math.floor(days / 365), "year");
}

export function evaluationNotes(place: Place): Evaluation[] {
  return (place.evaluations ?? []).filter((e) => e.note).reverse();
}
