// src/utils/consistency.ts
// Pure logic for the consistency grid. No React, no side effects: easy to unit test.
import { toLocalDateString } from "./dates";

export const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;
export const RECENT_WEEKS = 8;

const DAYS_IN_WEEK = 7;
const DAY_IN_MS = 86_400_000;

export type CalendarDay = {
  /** Local date, YYYY-MM-DD */
  date: string;
  /** False for padding days outside the displayed period (e.g. Dec 29 in a 2026 grid) */
  inRange: boolean;
  isToday: boolean;
  isFuture: boolean;
  hasSession: boolean;
};

/** One week = one column of the grid, Monday first. */
export type CalendarWeek = readonly CalendarDay[];

export function startOfMondayWeek(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

// setDate works on the local calendar, so it is safe across DST changes
// (adding 24h * n in milliseconds is not).
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

type BuildParams = {
  firstMonday: Date;
  weekCount: number;
  today: Date;
  sessionDates: ReadonlySet<string>;
  isInRange: (date: Date) => boolean;
};

function buildWeeks({
  firstMonday,
  weekCount,
  today,
  sessionDates,
  isInRange,
}: BuildParams): CalendarWeek[] {
  const todayString = toLocalDateString(today);

  return Array.from({ length: weekCount }, (_week, weekIndex) =>
    Array.from({ length: DAYS_IN_WEEK }, (_day, weekdayIndex) => {
      const date = addDays(
        firstMonday,
        weekIndex * DAYS_IN_WEEK + weekdayIndex,
      );
      const dateString = toLocalDateString(date);

      return {
        date: dateString,
        inRange: isInRange(date),
        isToday: dateString === todayString,
        // YYYY-MM-DD strings sort chronologically
        isFuture: dateString > todayString,
        hasSession: sessionDates.has(dateString),
      };
    }),
  );
}

/** Last `weekCount` weeks, the last column being the current week. */
export function getRecentWeeks(
  sessionDates: ReadonlySet<string>,
  today: Date = new Date(),
  weekCount: number = RECENT_WEEKS,
): CalendarWeek[] {
  const firstMonday = addDays(
    startOfMondayWeek(today),
    -(weekCount - 1) * DAYS_IN_WEEK,
  );

  return buildWeeks({
    firstMonday,
    weekCount,
    today,
    sessionDates,
    isInRange: () => true,
  });
}

/** All weeks touching `year` (53 or 54 columns), padding days flagged `inRange: false`. */
export function getYearWeeks(
  year: number,
  sessionDates: ReadonlySet<string>,
  today: Date = new Date(),
): CalendarWeek[] {
  const firstMonday = startOfMondayWeek(new Date(year, 0, 1));
  const lastMonday = startOfMondayWeek(new Date(year, 11, 31));

  // Weeks between the first and the last Monday, plus the first one.
  // Math.round absorbs the +-1h introduced by DST changes.
  const weekCount =
    Math.round(
      (lastMonday.getTime() - firstMonday.getTime()) / DAY_IN_MS / DAYS_IN_WEEK,
    ) + 1;

  return buildWeeks({
    firstMonday,
    weekCount,
    today,
    sessionDates,
    isInRange: (date) => date.getFullYear() === year,
  });
}

/** Years to offer in the picker: current year, years with sessions, and the requested one. */
export function getAvailableYears(
  sessionDates: readonly string[],
  currentYear: number,
  requestedYear?: number,
): number[] {
  const years = new Set<number>([currentYear]);
  if (requestedYear !== undefined && requestedYear <= currentYear) {
    years.add(requestedYear);
  }

  for (const date of sessionDates) {
    const year = Number(date.slice(0, 4));
    if (Number.isInteger(year) && year <= currentYear) {
      years.add(year);
    }
  }

  return Array.from(years).sort((a, b) => b - a);
}

export function countSessions(weeks: readonly CalendarWeek[]): number {
  return weeks.reduce(
    (total, week) =>
      total + week.filter((day) => day.inRange && day.hasSession).length,
    0,
  );
}

/** Index of the column containing today, or -1 if today is not in the displayed weeks. */
export function findTodayWeekIndex(weeks: readonly CalendarWeek[]): number {
  return weeks.findIndex((week) => week.some((day) => day.isToday));
}

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type MonthLabel = { label: string; weekIndex: number };

/**
 * One label per month, placed on the column that holds most of the month's
 * first week: if the 1st falls Mon-Thu its own column, otherwise the next one.
 */
export function getMonthLabels(
  year: number,
  weeks: readonly CalendarWeek[],
): MonthLabel[] {
  const labels: MonthLabel[] = [];

  for (let month = 0; month < 12; month++) {
    const first = new Date(year, month, 1);
    const firstString = toLocalDateString(first);
    const weekIndex = weeks.findIndex((week) =>
      week.some((day) => day.date === firstString),
    );
    if (weekIndex === -1) continue;

    const weekdayIndex = (first.getDay() + 6) % 7; // Monday = 0
    labels.push({
      label: MONTH_LABELS[month],
      weekIndex: weekdayIndex <= 3 ? weekIndex : weekIndex + 1,
    });
  }

  return labels;
}
