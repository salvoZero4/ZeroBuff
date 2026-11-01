export type SetLogCreate = {
  set_number: number;
  reps: number;
  weight: number;
  rir?: number | null;
};
export type SetLogUpdate = {
  set_number?: number | null;
  reps?: number | null;
  weight?: number | null;
  rir?: number | null;
};
export type SetLogRead = {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number;
  rir: number | null;
};
export type SessionCreate = { routine_id?: string | null; started_at: string };
export type SessionRead = {
  id: string;
  routine_id: string | null;
  status: string;
  date: string;
  started_at: string;
  ended_at: string | null;
};
export type SessionDetailRead = SessionRead & { sets: SetLogRead[] };
export type SessionUpdate = { status: string; ended_at?: string | null };
export type GetSessionsParams = { offset?: number; limit?: number };
