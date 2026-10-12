import { apiRequest } from "./client";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type ScheduleCreate = {
  routine_id: string; // uuid
  day_of_week: DayOfWeek;
};

export type ScheduleRead = {
  id: string; // uuid
  user_id: string; // uuid
  routine_id: string; // uuid
  routine_name: string;
  day_of_week: DayOfWeek;
};

export type ScheduleUpdate = {
  routine_id?: string | null;
  day_of_week?: DayOfWeek | null;
};

export function getSchedule(): Promise<ScheduleRead[]> {
  return apiRequest<ScheduleRead[]>("/schedule/");
}

export function getTodaySchedule(): Promise<ScheduleRead | null> {
  return apiRequest<ScheduleRead | null>("/schedule/today");
}

export function createSchedule(payload: ScheduleCreate): Promise<ScheduleRead> {
  return apiRequest<ScheduleRead>("/schedule/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSchedule(
  scheduleId: string,
  payload: ScheduleUpdate,
): Promise<ScheduleRead> {
  return apiRequest<ScheduleRead>(`/schedule/${scheduleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSchedule(scheduleId: string): Promise<void> {
  return apiRequest<void>(`/schedule/${scheduleId}`, {
    method: "DELETE",
  });
}
