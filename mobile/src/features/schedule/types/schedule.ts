export type DayOfWeek =
  | "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";

export type ScheduleCreate = { routine_id: string; day_of_week: DayOfWeek };
export type ScheduleRead = {
  id: string;
  user_id: string;
  routine_id: string;
  routine_name: string;
  day_of_week: DayOfWeek;
};
export type ScheduleUpdate = {
  routine_id?: string | null;
  day_of_week?: DayOfWeek | null;
};
