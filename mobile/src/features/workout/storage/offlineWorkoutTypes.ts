import type { RoutineRead } from "@/features/routines/types/routine";
import type { ScheduleRead } from "@/features/schedule/types/schedule";
import type { ActiveWorkoutSession } from "../types/activeWorkout";
import type { WorkoutSummary } from "../utils/experience";

export type CompletedWorkout = {
  id: string;
  routine_id: string;
  started_at: string;
  ended_at: string;
  sets: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    rir: number | null;
  }[];
};

export type QueuedWorkout = {
  payload: CompletedWorkout;
  summary: WorkoutSummary;
  routine: RoutineRead;
  error: string | null;
};

export type OfflineWorkoutStorage = {
  createId(): string;
  readDraft(account: string): Promise<ActiveWorkoutSession | null>;
  saveDraft(account: string, draft: ActiveWorkoutSession): Promise<void>;
  discardDraft(account: string, id: string): Promise<void>;
  finish(account: string, workout: QueuedWorkout): Promise<void>;
  list(account: string): Promise<QueuedWorkout[]>;
  block(account: string, id: string, error: string): Promise<void>;
  remove(account: string, id: string): Promise<void>;
  readRoutine(account: string, id: string): Promise<RoutineRead | null>;
  saveRoutine(account: string, routine: RoutineRead): Promise<void>;
  removeRoutine(account: string, id: string): Promise<void>;
  readSchedule(account: string): Promise<ScheduleRead[] | null>;
  saveSchedule(account: string, schedule: ScheduleRead[]): Promise<void>;
};
