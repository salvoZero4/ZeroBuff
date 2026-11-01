import { apiRequest } from "@/shared/api/client";
import type {
  GetSessionsParams,
  SessionCreate,
  SessionDetailRead,
  SessionRead,
  SessionUpdate,
  SetLogCreate,
  SetLogRead,
  SetLogUpdate,
} from "@/features/workout/types/session";

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
