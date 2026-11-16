import {
  isOpenAt,
  openShareInSlot,
  parseOpeningHours,
  weekendOpenShare,
} from "../openingHours";

const h = (n: number) => n * 60;

describe("parseOpeningHours", () => {
  it("parses weekday ranges with later rules overriding earlier ones", () => {
    const s = parseOpeningHours("Mo-Su 08:00-18:00; Sa,Su 09:00-17:00; We off");
    expect(s?.[1]).toEqual([[h(8), h(18)]]);
    expect(s?.[6]).toEqual([[h(9), h(17)]]);
    expect(s?.[3]).toEqual([]);
  });

  it("handles split shifts, wrapping day ranges, overnight hours and 24/7", () => {
    const s = parseOpeningHours("Fr-Mo 07:00-11:00, 12:00-02:00");
    expect(s?.[0]).toEqual([
      [h(7), h(11)],
      [h(12), h(26)],
    ]);
    expect(s?.[3]).toEqual([]);
    expect(parseOpeningHours("24/7")?.every((d) => d[0]?.[1] === 1440)).toBe(
      true,
    );
    expect(parseOpeningHours("10:00-16:00")?.[4]).toEqual([[h(10), h(16)]]);
  });

  it("ignores public-holiday rules and PH in selectors", () => {
    const s = parseOpeningHours(
      "Mo-Fr 07:30-18:00; Sa-Su,PH 08:00-17:00; PH off",
    );
    expect(s?.[0]).toEqual([[h(8), h(17)]]);
  });

  it("returns undefined for empty or unsupported values", () => {
    expect(parseOpeningHours(undefined)).toBeUndefined();
    expect(parseOpeningHours("PH off")).toBeUndefined();
    expect(parseOpeningHours("Mo-Fr sunrise-sunset")).toBeUndefined();
    expect(parseOpeningHours("Xx 10:00-12:00")).toBeUndefined();
    expect(parseOpeningHours("Mo 25:00-26:00")).toBeUndefined();
    expect(parseOpeningHours("Mo-Fr 10:00")).toBeUndefined();
  });
});

describe("isOpenAt and slot helpers", () => {
  const late = parseOpeningHours("Mo-Fr 09:00-01:00; Sa 10:00-14:00; Su off")!;

  it("checks today and spill-over from yesterday", () => {
    expect(isOpenAt(late, 1, h(10))).toBe(true);
    expect(isOpenAt(late, 2, h(0) + 30)).toBe(true);
    expect(isOpenAt(late, 1, h(0) + 30)).toBe(false);
    expect(isOpenAt(late, 0, h(12))).toBe(false);
    expect(isOpenAt(late, 6, h(0) + 30)).toBe(true);
  });

  it("scores slots and weekends", () => {
    expect(openShareInSlot(late, "weekday-evening")).toBe(1);
    expect(openShareInSlot(late, "weekend-afternoon")).toBe(0);
    expect(openShareInSlot(late, "weekend-morning")).toBe(0);
    expect(weekendOpenShare(late)).toBe(0.5);
  });
});
