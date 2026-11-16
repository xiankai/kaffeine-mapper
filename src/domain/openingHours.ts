import { DayPart, Slot } from "./types";

export type Interval = [number, number];
export type WeekSchedule = Interval[][];

const DAY_CODES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function dayRange(from: string, to: string): number[] | undefined {
  const start = MONDAY_FIRST.indexOf(DAY_CODES.indexOf(from));
  const end = MONDAY_FIRST.indexOf(DAY_CODES.indexOf(to));
  if (start < 0 || end < 0) return undefined;
  const days: number[] = [];
  for (let i = start; ; i = (i + 1) % 7) {
    days.push(MONDAY_FIRST[i] as number);
    if (i === end) return days;
  }
}

function parseDays(selector: string): number[] | undefined {
  const days = new Set<number>();
  for (const part of selector.split(",").filter((p) => p !== "PH")) {
    const [from, to] = part.split("-");
    const range = dayRange(from as string, to ?? (from as string));
    if (!range) return undefined;
    range.forEach((d) => days.add(d));
  }
  return days.size > 0 ? [...days] : undefined;
}

function toMinutes(time: string): number | undefined {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes <= 1440 ? minutes : undefined;
}

function parseTimes(spec: string): Interval[] | undefined {
  if (/^(off|closed)$/i.test(spec)) return [];
  const intervals: Interval[] = [];
  for (const span of spec.split(",")) {
    const [a, b] = span.trim().split("-");
    const start = toMinutes(a ?? "");
    const end = toMinutes(b ?? "");
    if (start === undefined || end === undefined) return undefined;
    intervals.push([start, end <= start ? end + 1440 : end]);
  }
  return intervals;
}

function parseRule(
  rule: string,
): { days: number[]; intervals: Interval[] } | undefined {
  const match = rule.match(
    /^((?:(?:[A-Z][a-z]|PH)(?:-[A-Z][a-z])?,?)+)?\s*(.*)$/,
  );
  const days = match?.[1] ? parseDays(match[1].replace(/,$/, "")) : ALL_DAYS;
  const intervals = parseTimes((match?.[2] ?? "").trim() || "00:00-24:00");
  if (!days || !intervals) return undefined;
  return { days, intervals };
}

export function parseOpeningHours(
  value: string | undefined,
): WeekSchedule | undefined {
  if (!value) return undefined;
  const text = value.trim();
  if (text === "24/7") return ALL_DAYS.map(() => [[0, 1440]]);
  const schedule: WeekSchedule = ALL_DAYS.map(() => []);
  const rules = text
    .split(";")
    .map((r) => r.trim())
    .filter((r) => r && !/^PH\b/.test(r));
  if (rules.length === 0) return undefined;
  for (const rule of rules) {
    const parsed = parseRule(rule);
    if (!parsed) return undefined;
    parsed.days.forEach((d) => (schedule[d] = parsed.intervals));
  }
  return schedule;
}

export function isOpenAt(
  schedule: WeekSchedule,
  day: number,
  minute: number,
): boolean {
  const today = schedule[day] ?? [];
  const yesterday = schedule[(day + 6) % 7] ?? [];
  return (
    today.some(([s, e]) => minute >= s && minute < e) ||
    yesterday.some(([, e]) => e > 1440 && minute < e - 1440)
  );
}

export const SLOT_SAMPLE_MINUTE: Record<DayPart, number> = {
  morning: 9 * 60,
  afternoon: 14 * 60,
  evening: 19 * 60 + 30,
};

export function slotDays(slot: Slot): number[] {
  return slot.startsWith("weekday") ? [1, 2, 3, 4, 5] : [6, 0];
}

export function slotPart(slot: Slot): DayPart {
  return slot.split("-")[1] as DayPart;
}

export function openShareInSlot(schedule: WeekSchedule, slot: Slot): number {
  const days = slotDays(slot);
  const minute = SLOT_SAMPLE_MINUTE[slotPart(slot)];
  return days.filter((d) => isOpenAt(schedule, d, minute)).length / days.length;
}

export function weekendOpenShare(schedule: WeekSchedule): number {
  return [6, 0].filter((d) => (schedule[d] ?? []).length > 0).length / 2;
}
