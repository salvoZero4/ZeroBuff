import type { ExerciseSessionLog } from "@/features/exercises/types/exercise";
import type { SetLogCreate } from "@/features/workout/types/session";
import { toLocalDateString } from "@/shared/utils/dates";

export type Period = "1M" | "3M" | "6M" | "All";
export type Metric = "Load" | "Reps" | "Volume" | "Est. 1RM";
export type Point = { id: string; date: string; value: number; time?: number };
export type HistoryEntry = ExerciseSessionLog & { started_at?: string };
export const PERIODS: Period[] = ["1M", "3M", "6M", "All"];
export const METRICS: Metric[] = ["Load", "Reps", "Volume", "Est. 1RM"];
export function periodStart(period: Period, now = new Date()): string {
  if (period === "All") return "";
  const date = new Date(now);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() - Number.parseInt(period, 10));
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  date.setDate(Math.min(day, lastDay));
  return toLocalDateString(date);
}
export function dateLabel(date: string): string {
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function numberLabel(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
export function metricValue(
  sets: ExerciseSessionLog["sets"],
  metric: Metric,
): number {
  if (!sets.length) return 0;
  if (metric === "Volume")
    return sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
  return Math.max(
    ...sets.map((set) =>
      metric === "Reps"
        ? set.reps
        : metric === "Est. 1RM"
          ? set.weight * (1 + set.reps / 30)
          : set.weight,
    ),
  );
}
export function exercisePoints(
  sessions: HistoryEntry[],
  metric: Metric,
  period: Period,
): Point[] {
  return sessions
    .filter((s) => s.date >= periodStart(period) && s.sets.length > 0)
    .map((s) => ({
      id: s.session_id,
      date: s.date,
      time: Date.parse(s.started_at ?? s.date),
      value: metricValue(s.sets, metric),
    }))
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
}
export function decimal(value: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const result = Number(value.trim().replace(",", "."));
  return Number.isFinite(result) ? result : null;
}
export function parseSet(values: {
  weight: string;
  reps: string;
  rir: string;
  set_number: string;
}): SetLogCreate {
  const weight = decimal(values.weight),
    reps = decimal(values.reps),
    set_number = decimal(values.set_number);
  const rir = values.rir.trim() === "" ? null : decimal(values.rir);
  if (weight === null || weight < 0)
    throw new Error("Enter a load of 0 or more.");
  if (reps === null || !Number.isInteger(reps) || reps < 1)
    throw new Error("Reps must be a whole number of at least 1.");
  if (set_number === null || !Number.isInteger(set_number) || set_number < 1)
    throw new Error("Set number must be a whole number of at least 1.");
  if (
    values.rir.trim() !== "" &&
    (rir === null || !Number.isInteger(rir) || rir > 10)
  )
    throw new Error("RIR must be a whole number from 0 to 10, or empty.");
  return { weight, reps, set_number, rir };
}
export function rollingWeight(points: Point[]): Point[] {
  return points.map((point) => {
    const end = Date.parse(point.date),
      start = end - 6 * 86400000;
    const window = points.filter(
      (p) => Date.parse(p.date) >= start && Date.parse(p.date) <= end,
    );
    return {
      ...point,
      value: window.reduce((sum, p) => sum + p.value, 0) / window.length,
    };
  });
}
export function chartGeometry(points: Point[], width: number, height: number) {
  if (!points.length) return { min: 0, max: 1, points: [] };
  const values = points.map((p) => p.value);
  const low = Math.min(...values),
    high = Math.max(...values);
  const padding = Math.max((high - low) * 0.15, 0.5);
  const min = Math.max(0, low - padding),
    max = high + padding;
  const dates = points.map((p) => p.time ?? Date.parse(p.date));
  const start = Math.min(...dates),
    end = Math.max(...dates);
  return {
    min,
    max,
    points: points.map((point, i) => ({
      ...point,
      x:
        end === start
          ? width / 2
          : ((dates[i] - start) / (end - start)) * width,
      y: height - ((point.value - min) / (max - min)) * height,
    })),
  };
}
export function parseWeight(value: string, date: string, now = new Date()) {
  const weight = decimal(value);
  if (weight === null || weight <= 0 || weight > 500)
    throw new Error("Enter a weight greater than 0 and no more than 500.");
  const parsedDate = new Date(`${date}T12:00:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsedDate.getTime()) ||
    toLocalDateString(parsedDate) !== date
  )
    throw new Error("Enter a valid date in YYYY-MM-DD format.");
  if (date > toLocalDateString(now))
    throw new Error("Choose today or an earlier date.");
  return { weight, date };
}
