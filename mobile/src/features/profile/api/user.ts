import { apiRequest } from "@/shared/api/client";
import type { UserNewInfo, UserResponse } from "@/features/profile/types/user";

export function getCurrentUser(): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/me");
}

export function updateCurrentUser(payload: UserNewInfo): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
