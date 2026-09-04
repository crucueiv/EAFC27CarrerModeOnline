export const SUMMER_WINDOW_OPEN_MONTH = 7;
export const SUMMER_WINDOW_OPEN_DAY = 1;
export const SUMMER_WINDOW_CLOSE_MONTH = 9;
export const SUMMER_WINDOW_CLOSE_DAY = 1;

export const WINTER_WINDOW_OPEN_MONTH = 1;
export const WINTER_WINDOW_OPEN_DAY = 1;
export const WINTER_WINDOW_CLOSE_MONTH = 1;
export const WINDOW_CLOSE_DAY_31 = 31;

export const SEASON_END_MONTH = 6;
export const SEASON_END_DAY = 30;

export const SEASON_START_MONTH = 7;
export const SEASON_START_DAY = 5;

export function utcMidnight(year: number, month: number, day: number): Date {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error("utcMidnight requires integer year/month/day");
  }
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
  if (day < 1 || day > 31) throw new Error(`Invalid day: ${day}`);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function minDate(...dates: Array<Date | null | undefined>): Date {
  let min: Date | null = null;
  for (const d of dates) {
    if (!d) continue;
    if (min === null || d.getTime() < min.getTime()) min = d;
  }
  if (!min) throw new Error("minDate requires at least one valid date");
  return min;
}

export type SeasonCycle = {
  startDate: Date;
  endDate: Date;
  summerOpen: Date;
  summerClose: Date;
  winterOpen: Date;
  winterClose: Date;
  transitionStart: Date;
  transitionEnd: Date;
};

export function getSeasonCycle(referenceYear: number, now: Date = new Date()): SeasonCycle {
  const year = referenceYear ?? now.getUTCFullYear();

  const startDate = utcMidnight(year, SEASON_START_MONTH, SEASON_START_DAY);
  const seasonEnd = utcMidnight(year + 1, SEASON_END_MONTH, SEASON_END_DAY);
  const summerOpen = utcMidnight(year, SUMMER_WINDOW_OPEN_MONTH, SUMMER_WINDOW_OPEN_DAY);
  const summerClose = utcMidnight(year, SUMMER_WINDOW_CLOSE_MONTH, SUMMER_WINDOW_CLOSE_DAY);
  const winterOpen = utcMidnight(year + 1, WINTER_WINDOW_OPEN_MONTH, WINTER_WINDOW_OPEN_DAY);
  const winterClose = utcMidnight(year + 1, WINTER_WINDOW_CLOSE_MONTH, WINDOW_CLOSE_DAY_31);
  const transitionStart = utcMidnight(year, SEASON_END_MONTH, SEASON_END_DAY);
  const transitionEnd = addDaysUtc(startDate, -1);

  return {
    startDate,
    endDate: seasonEnd,
    summerOpen,
    summerClose,
    winterOpen,
    winterClose,
    transitionStart,
    transitionEnd,
  };
}

export function resolveSeasonForDate(date: Date): { cycle: SeasonCycle; isOffSeason: boolean } {
  const year = date.getUTCFullYear();
  const cycle = getSeasonCycle(year, date);

  if (date.getTime() >= cycle.startDate.getTime() && date.getTime() <= cycle.endDate.getTime()) {
    return { cycle, isOffSeason: false };
  }

  if (date.getTime() < cycle.startDate.getTime()) {
    const prev = getSeasonCycle(year - 1, date);
    if (date.getTime() >= prev.startDate.getTime() && date.getTime() <= prev.endDate.getTime()) {
      return { cycle: prev, isOffSeason: false };
    }
    return { cycle: prev, isOffSeason: true };
  }

  const next = getSeasonCycle(year + 1, date);
  if (date.getTime() >= next.startDate.getTime() && date.getTime() <= next.endDate.getTime()) {
    return { cycle: next, isOffSeason: false };
  }
  return { cycle, isOffSeason: true };
}
