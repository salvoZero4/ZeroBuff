import { apiRequest } from "@/shared/api/client";
import type {
  ListWeightsParams,
  WeightLogCreate,
  WeightLogRead,
  WeightLogUpdate,
} from "@/features/weight/types/weight";

export function getTodayWeight(day?: string): Promise<WeightLogRead | null> {
  const queryString = day ? `?day=${encodeURIComponent(day)}` : "";
  return apiRequest<WeightLogRead | null>(`/weight/today${queryString}`);
}

export function getWeights(
  params: ListWeightsParams = {},
): Promise<WeightLogRead[]> {
  const query = new URLSearchParams();
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);

  const querysString = query.toString();
  return apiRequest<WeightLogRead[]>(
    `/weight${querysString ? `?${querysString}` : ""}`,
  );
}

export function createWeight(payload: WeightLogCreate): Promise<WeightLogRead> {
  return apiRequest<WeightLogRead>("/weight", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWeight(
  logId: string,
  payload: WeightLogUpdate,
): Promise<WeightLogRead> {
  return apiRequest<WeightLogRead>(`/weight/${logId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteWeight(logId: string): Promise<void> {
  return apiRequest<void>(`/weight/${logId}`, {
    method: "DELETE",
  });
}
