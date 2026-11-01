import { tokenStore } from "../stores/tokenStore";
import { apiRequest } from "./client";

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  id: string;
  email: string;
  username: string;
};

export type ChangePasswordInput = {
  new_password: string;
};

async function authenticate(path: string, body: object): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>(path, {
    method: "POST",
    auth: false,
    body: JSON.stringify(body),
  });
  await tokenStore.setTokens(data.access_token, data.refresh_token);
  return data;
}

export function login(email: string, password: string) {
  return authenticate("/auth/login", { email, password });
}

export function register(username: string, email: string, password: string) {
  return authenticate("/auth/register", { username, email, password });
}

export type ChangePasswordResponse = {
  message: string;
};

export function changePassword(
  payload: ChangePasswordInput,
): Promise<ChangePasswordResponse> {
  return apiRequest<ChangePasswordResponse>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function restoreSession(): Promise<boolean> {
  await tokenStore.load();
  return tokenStore.getRefresh() !== null;
}

export async function logout(): Promise<void> {
  await tokenStore.clear();
}
