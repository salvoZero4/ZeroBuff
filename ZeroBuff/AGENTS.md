# ZeroBuff Mobile — AI Agent Directives & Architecture Rules

This is an Expo/React Native mobile application for **ZeroBuff**, a science-based progressive overload strength training tracker. Prioritize mobile-first patterns, performance, offline-first reliability, and gym-ready usability.

---

## 1. Expo Rules & Tooling (Strict)

### Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

### Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npx expo lint` and `npx tsc --noEmit` before declaring any task done.

### Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (`components/`, `hooks/`, `services/`, `utils/`, `types/`) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

### Native Modules & EAS

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules (e.g. `expo-secure-store`, `expo-haptics`) over third-party unvetted libraries.

---

## 2. ZeroBuff Architecture & Data Flow

- **Backend Base URL:** The API base URL must NEVER be hardcoded. Read it dynamically from `process.env.EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8000` in local dev).
- **Authentication & Storage:**
  - Store JWT Bearer Tokens (`access_token` and `refresh_token`) securely via `expo-secure-store`[cite: 1].
  - Inject the access token into requests: `Authorization: Bearer <access_token>`[cite: 1].
  - Handle automatic token refresh calling `POST /v1/auth/refresh` on 401 Unauthorized[cite: 1].
- **State Management & Network Layer:**
  - Use TanStack Query (`@tanstack/react-query`) for queries, mutations, cache invalidation, and optimistic UI updates.
  - Encapsulate all HTTP calls in isolated client modules inside `src/services/api/`. Do not write raw `fetch` calls directly in UI components.
- **Gym Usability & Offline State:**
  - Gyms have poor connectivity. In-workout set logging (`POST /v1/session/{session_id}/log/{exercise_id}`) must update UI immediately with optimistic cache updates[cite: 1].

---

## 3. UI Design System (Iron & Copper)

- **Color Palette:**
  - **Background / Iron:** Deep dark mode (`#121212`, card surfaces `#1E1E22`, borders/dividers `#2A2A30`).
  - **Accent / Copper:** Rich metallic copper (`#C86D3B`, deep copper `#A0522D`, interactive/hover `#D97736`).
  - **Text & Status:** High-contrast text (`#F5F5F7`), muted secondary labels (`#8E8E93`), success `#4CAF50`, error/warning `#E53935`.
- **Gym Usability Guidelines:**
  - **Touch targets:** Minimum touch area of 48x48 pt for all interactive controls (buttons, checkboxes, incrementers).
  - **Inputs:** Numeric inputs (`weight`, `reps`, `rir`, `rest_time`) must specify `keyboardType="decimal-pad"` or `keyboardType="numeric"`.
  - **Quick Plate Increments:** Quick-stepper pills (`+1.25`, `+2.5`, `+5 kg`) for rapid weight adjustment.
  - **Haptics:** Trigger `expo-haptics` on completing a set or saving a workout.

---

## 4. Scientific Formulas & Overload Domain Rules

- **Total Set Volume:**
  `Volume = weight * reps`
- **Estimated 1RM (Epley Formula):**
  `1RM = weight * (1 + (reps / 30))`
- **Estimated 1RM (Brzycki Formula, reps <= 10):**
  `1RM = weight * (36 / (37 - reps))`
- **RIR (Reps In Reserve):** Stored as integer between `0` and `10`[cite: 1]. RIR 0 = Muscle Failure.
- **Progressive Overload Alert:** When current set weight, volume, or estimated 1RM beats the previous workout's performance for the same exercise, highlight the metric in Copper (`#C86D3B`).

---

## 5. Exact Backend REST API Specification

Base prefix: `${process.env.EXPO_PUBLIC_API_URL}`

### 5.1. Authentication (`/v1/auth`)

- `POST /v1/auth/register` (Rate limit: 5/min)[cite: 1]
  - **Body:** `{ "username": "string", "email": "user@example.com", "password": "Password123" }`[cite: 1]
  - _(Password must be >= 8 chars, contain at least 1 digit, 1 uppercase, 1 lowercase letter)_[cite: 1]
  - **Response (201):** `AuthOutput` (`{ id, username, email, access_token, refresh_token, token_type }`)[cite: 1]
- `POST /v1/auth/login` (Rate limit: 3/min)[cite: 1]
  - **Body:** `{ "email": "user@example.com", "password": "Password123" }`[cite: 1]
  - **Response (200):** `AuthOutput` (`{ id, username, email, access_token, refresh_token, token_type }`)[cite: 1]
- `POST /v1/auth/refresh` (Rate limit: 1/min)[cite: 1]
  - **Body:** `{ "refresh_token": "string" }`[cite: 1]
  - **Response (200):** `TokenRefreshOutput` (`{ access_token, token_type }`)[cite: 1]
- `POST /v1/auth/change-password` (Rate limit: 2/min, Auth required)[cite: 1]
  - **Body:** `{ "new_password": "NewPassword123" }`[cite: 1]
  - **Response (200):** `{ "message": "Password changed successfully" }`[cite: 1]

### 5.2. Users (`/v1/users`)

- `GET /v1/users/me` (Auth required)[cite: 1]
  - **Response (200):** `UserResponse` (`{ id, username, email, sex, date_of_birth, height_cm }`)[cite: 1]
- `PATCH /v1/users/me` (Auth required)[cite: 1]
  - **Body:** `UserNewInfo` (`{ username?, email?, sex?, date_of_birth?, height_cm? }`)[cite: 1]
  - **Response (200):** `UserResponse`[cite: 1]

### 5.3. Body Weight (`/v1/weight`)

- `GET /v1/weight/today?day=YYYY-MM-DD` (Auth required, `day` optional, defaults to today)[cite: 1]
  - **Response (200):** `WeightLogRead | null`[cite: 1]
- `GET /v1/weight?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` (Auth required)[cite: 1]
  - **Response (200):** `WeightLogRead[]` (ordered by date desc)[cite: 1]
- `POST /v1/weight` (Auth required)[cite: 1]
  - **Body:** `{ "weight": 78.5, "date": "2026-10-02" }` (`date` optional, defaults to server today; max +1 day future tolerance; `0 < weight <= 500`)[cite: 1]
  - **Response (201):** `WeightLogRead` (`{ id, date, weight }`)[cite: 1]
  - _(Fails with 409 Conflict if weight is already logged for that date)_[cite: 1]
- `PATCH /v1/weight/{log_id}` (Auth required)[cite: 1]
  - **Body:** `{ "weight": 79.0 }` (`0 < weight <= 500`)[cite: 1]
  - **Response (200):** `WeightLogRead`[cite: 1]
- `DELETE /v1/weight/{log_id}` (Auth required)[cite: 1]
  - **Response (204):** Empty[cite: 1]

### 5.4. Exercises (`/v1/exercises`)

- `GET /v1/exercises/?name=&limit=10&offset=0&muscle_group=` (Auth required, limit max 100)[cite: 1]
  - **Response (200):** `{ exercises: ExerciseRead[] }`[cite: 1]
- `GET /v1/exercises/search?query=bench` (Auth required, min 3 chars)[cite: 1]
  - **Response (200):** `{ results: { exercise: ExerciseRead, score: number }[] }`[cite: 1]
- `POST /v1/exercises/` (Auth required)[cite: 1]
  - **Body:** `ExerciseCreated` (`{ name, muscle_group, secondary_muscle_groups?, equipment }`)[cite: 1]
  - **Response (201):** `ExerciseRead`[cite: 1]
- `GET /v1/exercises/{exercise_id}` (Auth required)[cite: 1]
  - **Response (200):** `ExerciseRead`[cite: 1]
- `PATCH /v1/exercises/{exercise_id}` (Auth required, custom exercises created by user only)[cite: 1]
  - **Body:** `ExerciseModified` (`{ name?, muscle_group?, secondary_muscle_groups?, equipment? }`)[cite: 1]
  - **Response (200):** `ExerciseRead`[cite: 1]
- `DELETE /v1/exercises/{exercise_id}` (Auth required, custom unreferenced exercises only)[cite: 1]
  - **Response (204):** Empty[cite: 1]
- `GET /v1/exercises/{exercise_id}/stats?limit=10&offset=0` (Auth required)[cite: 1]
  - **Response (200):** `ExerciseStatsResponse` (`{ exercise_id, sessions: [{ session_id, date, sets: [{ set_number, reps, weight, rir }] }] }`)[cite: 1]

### 5.5. Routines (`/v1/routines`)

- `GET /v1/routines/?limit=10&offset=0` (Auth required)[cite: 1]
  - **Response (200):** `RoutineListRead[]` (`[{ id, name, exercises_count, muscle_groups }]`)[cite: 1]
- `GET /v1/routines/{routine_id}` (Auth required)[cite: 1]
  - **Response (200):** `RoutineRead` (`{ id, name, exercises: ExerciseInRoutineRead[] }`)[cite: 1]
- `POST /v1/routines/` (Auth required)[cite: 1]
  - **Body:** `RoutineCreate` (`{ name: string, exercises: [{ exercise_id, sets, reps, rest_time, order_index }] }`)[cite: 1]
  - **Response (201):** `RoutineRead`[cite: 1]
- `PATCH /v1/routines/{routine_id}` (Auth required)[cite: 1]
  - **Body:** `RoutineUpdate` (`{ name?: string, exercises?: [{ exercise_id, sets, reps, rest_time, order_index }] }`)[cite: 1]
  - **Response (200):** `RoutineRead`[cite: 1]
- `DELETE /v1/routines/{routine_id}` (Auth required)[cite: 1]
  - **Response (204):** Empty[cite: 1]
- `GET /v1/routines/{routine_id}/stats` (Auth required)[cite: 1]
  - **Response (200):** `RoutineStats` (`{ routine_id, exercises_stats: [{ exercise_id, name, latest_weight, latest_date, previous_weight, previous_date, percentage_improvement }] }`)[cite: 1]

### 5.6. Schedule (`/v1/schedule`)

- `GET /v1/schedule/` (Auth required)[cite: 1]
  - **Response (200):** `ScheduleRead[]` (`[{ id, user_id, routine_id, day_of_week, routine_name }]`)[cite: 1]
- `GET /v1/schedule/today` (Auth required)[cite: 1]
  - **Response (200):** `ScheduleRead | null` (returns null if rest day)[cite: 1]
- `POST /v1/schedule/` (Auth required)[cite: 1]
  - **Body:** `ScheduleCreate` (`{ routine_id: UUID, day_of_week: DayOfWeek }`)[cite: 1]
  - **Response (201):** `ScheduleRead`[cite: 1]
- `PATCH /v1/schedule/{schedule_id}` (Auth required)[cite: 1]
  - **Body:** `ScheduleUpdate` (`{ routine_id?: UUID, day_of_week?: DayOfWeek }`)[cite: 1]
  - **Response (200):** `ScheduleRead`[cite: 1]
- `DELETE /v1/schedule/{schedule_id}` (Auth required)[cite: 1]
  - **Response (204):** Empty[cite: 1]

### 5.7. Workout Sessions & Live Sets (`/v1/session`)

- `GET /v1/session/?offset=0&limit=100` (Auth required)[cite: 1]
  - **Response (200):** `SessionRead[]` (`[{ id, routine_id, status, date, started_at, ended_at }]`)[cite: 1]
- `POST /v1/session/` (Auth required)[cite: 1]
  - **Body:** `SessionCreate` (`{ routine_id?: UUID, started_at: "YYYY-MM-DDTHH:mm:ssZ" }`)[cite: 1]
  - _(started_at cannot be in the future > 5 min, nor older than 24 hours. Status starts as "ongoing")_[cite: 1]
  - _(Fails with 409 Conflict if another session is already ongoing)_[cite: 1]
  - **Response (201):** `SessionRead`[cite: 1]
- `GET /v1/session/{session_id}` (Auth required)[cite: 1]
  - **Response (200):** `SessionDetailRead` (`{ id, routine_id, status, date, started_at, ended_at, sets: SetLogRead[] }`)[cite: 1]
- `PATCH /v1/session/{session_id}` (Auth required)[cite: 1]
  - **Body:** `SessionUpdate` (`{ status: "ongoing" | "paused" | "completed", ended_at?: datetime }`)[cite: 1]
  - **Response (200):** `SessionRead`[cite: 1]
- `POST /v1/session/{session_id}/log/{exercise_id}` (Auth required)[cite: 1]
  - **Body:** `SetLogCreate` (`{ set_number: int > 0, reps: int > 0, weight: float > 0, rir?: int (0-10) }`)[cite: 1]
  - **Response (201):** `SetLogRead` (`{ id, session_id, exercise_id, exercise_name, set_number, reps, weight, rir }`)[cite: 1]
- `PATCH /v1/session/{session_id}/log/{set_id}` (Auth required)[cite: 1]
  - **Body:** `SetLogUpdate` (`{ set_number?: int, reps?: int, weight?: float, rir?: int }`)[cite: 1]
  - **Response (200):** `SetLogRead`[cite: 1]
- `DELETE /v1/session/{session_id}/log/{set_id}` (Auth required)[cite: 1]
  - **Response (204):** Empty[cite: 1]

---

## 6. TypeScript DTO Interfaces & Enums

Create and maintain these exact types under `src/types/api.ts`:

```typescript
// Enums
export type Sex = "male" | "female" | "other";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type MuscleGroup =
  | "chest"
  | "chest_upper"
  | "lats"
  | "upper_back"
  | "lower_back"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "brachialis"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "adductors"
  | "abductors"
  | "hip_flexors"
  | "abs"
  | "obliques"
  | "traps"
  | "neck"
  | "cardio"
  | "full_body";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "smith_machine"
  | "cable"
  | "kettlebell"
  | "bodyweight"
  | "bodyweight_weighted"
  | "resistance_band"
  | "other";

export type SessionStatus = "ongoing" | "paused" | "completed";

// Auth
export interface AuthOutput {
  id: string;
  username: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenRefreshOutput {
  access_token: string;
  token_type: string;
}

// User
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  sex: Sex | null;
  date_of_birth: string | null; // YYYY-MM-DD
  height_cm: number | null;
}

export interface UserNewInfo {
  username?: string;
  email?: string;
  sex?: Sex;
  date_of_birth?: string;
  height_cm?: number;
}

// Weight
export interface WeightLogRead {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number;
}

export interface WeightLogCreate {
  weight: number;
  date?: string; // YYYY-MM-DD
}

export interface WeightLogUpdate {
  weight: number;
}

// Exercise
export interface ExerciseRead {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscle_groups: MuscleGroup[] | null;
  equipment: Equipment;
  created_by_user: string | null;
}

export interface ExerciseCreated {
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscle_groups?: MuscleGroup[];
  equipment: Equipment;
}

export interface ExerciseModified {
  name?: string;
  muscle_group?: MuscleGroup;
  secondary_muscle_groups?: MuscleGroup[];
  equipment?: Equipment;
}

export interface ExerciseListResponse {
  exercises: ExerciseRead[];
}

export interface ExerciseSearchResult {
  exercise: ExerciseRead;
  score: number;
}

export interface SearchResponse {
  results: ExerciseSearchResult[];
}

export interface ExerciseSessionLog {
  session_id: string;
  date: string;
  sets: {
    set_number: number;
    reps: number;
    weight: number;
    rir: number | null;
  }[];
}

export interface ExerciseStatsResponse {
  exercise_id: string;
  sessions: ExerciseSessionLog[];
}

// Routine
export interface ExerciseInRoutine {
  exercise_id: string;
  sets: number;
  reps: number;
  rest_time: number;
  order_index: number;
}

export interface ExerciseInRoutineRead extends ExerciseInRoutine {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
}

export interface RoutineRead {
  id: string;
  name: string;
  exercises: ExerciseInRoutineRead[];
}

export interface RoutineListRead {
  id: string;
  name: string;
  exercises_count: number;
  muscle_groups: MuscleGroup[];
}

export interface RoutineCreate {
  name: string;
  exercises: ExerciseInRoutine[];
}

export interface RoutineUpdate {
  name?: string;
  exercises?: ExerciseInRoutine[];
}

export interface ExerciseStats {
  exercise_id: string;
  name: string;
  latest_weight: number | null;
  latest_date: string | null;
  previous_weight: number | null;
  previous_date: string | null;
  percentage_improvement: number | null;
}

export interface RoutineStats {
  routine_id: string;
  exercises_stats: ExerciseStats[];
}

// Schedule
export interface ScheduleRead {
  id: string;
  user_id: string;
  routine_id: string;
  day_of_week: DayOfWeek;
  routine_name: string | null;
}

export interface ScheduleCreate {
  routine_id: string;
  day_of_week: DayOfWeek;
}

export interface ScheduleUpdate {
  routine_id?: string;
  day_of_week?: DayOfWeek;
}

// Session & Sets
export interface SessionRead {
  id: string;
  routine_id: string | null;
  status: SessionStatus;
  date: string; // YYYY-MM-DD
  started_at: string; // ISO datetime
  ended_at: string | null;
}

export interface SetLogRead {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number;
  rir: number | null;
}

export interface SessionDetailRead extends SessionRead {
  sets: SetLogRead[];
}

export interface SessionCreate {
  routine_id?: string;
  started_at: string; // ISO datetime
}

export interface SessionUpdate {
  status: SessionStatus;
  ended_at?: string;
}

export interface SetLogCreate {
  set_number: number;
  reps: number;
  weight: number;
  rir?: number | null;
}

export interface SetLogUpdate {
  set_number?: number;
  reps?: number;
  weight?: number;
  rir?: number | null;
}
```
