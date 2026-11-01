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

export type ChangePasswordResponse = {
  message: string;
};
