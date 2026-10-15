import { apiRequest } from "./client";

export type Sex = "male" | "female" | "other";

export type UserResponse = {
  id: string; // uuid
  username: string;
  email: string;
  sex?: Sex | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  height_cm?: number | null;
};

export type UserNewInfo = {
  username?: string | null;
  email?: string | null;
  sex?: Sex | null;
  date_of_birth?: string | null;
  height_cm?: number | null;
};

export function getCurrentUser(): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/me");
}

export function updateCurrentUser(payload: UserNewInfo): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
