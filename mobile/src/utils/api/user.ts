import { apiRequest } from "./client";

type Sex = {
  male: "Male";
  female: "Female";
  other: "Other";
};

export type UserRead = {
  id: string;
  username: string;
  email: string;
  sex: Sex | null;
  date_of_birth: string;
  height: number;
};

export type UserUpdate = {
  username: string | null;
  email: string | null;
  sex: Sex | null;
  date_of_birth: string | null;
  height: number | null;
};

export function getUser() {
  return apiRequest<UserRead>("users/me");
}

export function updateUser(payload: UserUpdate) {
  return apiRequest<UserUpdate>("users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
