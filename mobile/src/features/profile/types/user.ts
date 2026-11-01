export type Sex = "male" | "female" | "other";
export type UserResponse = {
  id: string;
  username: string;
  email: string;
  sex?: Sex | null;
  date_of_birth?: string | null;
  height_cm?: number | null;
};
export type UserNewInfo = {
  username?: string | null;
  email?: string | null;
  sex?: Sex | null;
  date_of_birth?: string | null;
  height_cm?: number | null;
};
