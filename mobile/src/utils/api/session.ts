import { apiRequest } from "./client";

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
  id: string; // uuid
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number;
  rir: number | null;
};

export type SessionCreate = {
  routine_id?: string | null;
  started_at: string; // ISO date-time
};

export type SessionRead = {
  id: string; // uuid
  routine_id: string | null;
  status: string;
  date: string; // YYYY-MM-DD
  started_at: string;
  ended_at: string | null;
};

export type SessionDetailRead = SessionRead & {
  sets: SetLogRead[];
};

export type SessionUpdate = {
  status: string;
  ended_at?: string | null;
};

export type GetSessionsParams = {
  offset?: number;
  limit?: number;
};

export function getSessions(
  params: GetSessionsParams = {},
): Promise<SessionRead[]> {
  const query = new URLSearchParams();
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const queryString = query.toString();
  return apiRequest<SessionRead[]>(
    `/session/${queryString ? `?${queryString}` : ""}`,
  );
}

export function getSessionDetails(
  sessionId: string,
): Promise<SessionDetailRead> {
  return apiRequest<SessionDetailRead>(`/session/${sessionId}`);
}

export function createSession(payload: SessionCreate): Promise<SessionRead> {
  return apiRequest<SessionRead>("/session/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSession(
  sessionId: string,
  payload: SessionUpdate,
): Promise<SessionRead> {
  return apiRequest<SessionRead>(`/session/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSessionApi(sessionId: string): Promise<void> {
  return apiRequest<void>(`/session/${sessionId}`, {
    method: "DELETE",
  });
}

export function createSetLogApi(
  sessionId: string,
  exerciseId: string,
  payload: SetLogCreate,
): Promise<SetLogRead> {
  return apiRequest<SetLogRead>(`/session/${sessionId}/log/${exerciseId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSetLogApi(
  sessionId: string,
  setId: string,
  payload: SetLogUpdate,
): Promise<SetLogRead> {
  return apiRequest<SetLogRead>(`/session/${sessionId}/log/${setId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSetLogApi(
  sessionId: string,
  setId: string,
): Promise<void> {
  return apiRequest<void>(`/session/${sessionId}/log/${setId}`, {
    method: "DELETE",
  });
}
