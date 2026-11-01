import { apiRequest } from "@/shared/api/client";
import type {
  ScheduleCreate,
  ScheduleRead,
  ScheduleUpdate,
} from "@/features/schedule/types/schedule";

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
