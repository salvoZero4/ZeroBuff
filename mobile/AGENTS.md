# ZeroBuff Mobile — AI Agent Directives & Architecture Rules

Expo / React Native app for **ZeroBuff**, a science-based progressive overload strength training tracker. Backend: FastAPI (separate project). Priorities: mobile-first patterns, performance, gym-ready usability, and online reliability. The app is **online-only** (no offline sync, see §2).

---

## 0. How to work

- **Language:** code, identifiers, comments and commit messages in English. All UI strings in English.
- **Think first:** for any non-trivial feature, give a short plan with alternatives and trade-offs, then code.
- **Conflicts:** if a request conflicts with this file or with the project decision log (`decisioni`), say so BEFORE implementing.
- **Missing info:** if a contract detail, design detail or copy is missing, ask. Do not invent it.
- **No unrequested additions:** no new dependencies, colors, fonts or tokens without asking. Install packages only with `npx expo install`.
- **Screens not yet in Figma:** you may propose a layout using ONLY the tokens in §4, keeping it minimal. Mark it `// PROVISIONAL` and list it in your summary. Screens still to design: routine detail, routine create/edit, exercise detail, exercise catalog/search, session history + detail (inside Analytics), Profile, end-of-session summary, login/register.
- **Patterns:** prefer established patterns: API client layer separated from UI, query-key factories, small pure helpers covered by unit tests, no business logic inside components.

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

### Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (`components/`, `hooks/`, `services/`, `utils/`, `types/`, `theme/`) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

### Native Modules & EAS

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules (e.g. `expo-secure-store`, `expo-haptics`) over third-party unvetted libraries.

---

## 2. Product decisions (do not contradict)

- **Online-only.** No offline sync, no persisted mutation queue. Optimistic updates are allowed (see §3.4).
- **UI entirely in English.**
- **Bottom nav:** Today / Routines / Analytics / Profile.
- **Analytics** holds both routine statistics and session history (with a selector to filter quickly). No separate "History" tab.
- **Home (final order):** day squares → today's routine card → body-weight banner (only if no weight logged today) → consistency grid → last-session card → "Edit your schedule" button → "Start workout" CTA fixed near the navbar. The "weekly summary" block was removed; do not re-add it.
- **Day squares:** horizontal, tappable, above today's card. Days with a routine use the active color; rest days stay neutral.
- **Consistency grid:** binary (trained / not trained, no intensity). Days are rows, weeks are columns, horizontally scrollable.
- **Weekly schedule screen:** one row per day with a routine picker / "Rest". Backend allows one routine per day: assign = `POST`, change = `PATCH`, "Rest" = `DELETE`.
- **Active session:** the user can move freely between exercises, not bound to the routine order (e.g. machine busy). UI: strip of exercise chips, weight × reps, stepper, "Mark set complete".
- **Routine save:** one single call (`POST`/`PATCH` with the full state: name + exercise list). Keep a local draft in the editor, send it once, and reassign `order_index` (0..n-1) on every reorder. No incremental calls.
- **Empty routines are allowed.**
- **Unit of measure:** kg is a working assumption, not a confirmed product choice. Keep it in one constant (`WEIGHT_UNIT = "kg"`), never hardcode "kg" in components.
- **Usage:** personal first, but may be used by others: never assume a single user.

---

## 3. Architecture & data flow

### 3.1 Layout

- `src/app/` — routes only.
- `src/services/api/` — one module per resource (`client.ts`, `auth.ts`, `weight.ts`, `session.ts`, ...). No raw `fetch` in UI components.
- `src/hooks/<resource>/` — TanStack Query hooks and the query-key factory for that resource.
- `src/components/` — shared UI. `src/utils/` — pure helpers. `src/types/api.ts` — DTOs (§7).

### 3.2 Network & auth

- **Base URL:** never hardcoded; read `process.env.EXPO_PUBLIC_API_URL` (default `http://localhost:8000`). `localhost` does not work on the Android emulator (use `http://10.0.2.2:8000`) nor on a physical device (use the machine's LAN IP). `EXPO_PUBLIC_*` values are bundled into the app: never put secrets in them.
- **Tokens:** persist `access_token` and `refresh_token` with `expo-secure-store`; keep an in-memory copy to avoid an async read on every request. Header: `Authorization: Bearer <access_token>`.
- **Refresh on 401** via `POST /v1/auth/refresh`, with these rules:
  - Refresh is rate-limited to **1/min**. Use a **single-flight refresh**: concurrent 401s share one Promise, then each request is retried once.
  - Never trigger the refresh logic for `/v1/auth/*` requests (a wrong password at login is a 401 and must not cause a refresh).
  - The refresh response does not include a new refresh token. If the refresh fails, clear SecureStore and navigate to login.

```ts
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
```

- **Render cold start:** the backend runs on a free tier and the first request after inactivity can take tens of seconds. Use generous timeouts and show a "waking up the server" state instead of an error.

### 3.3 Server state (TanStack Query)

- All server data goes through `@tanstack/react-query`. Use a **query-key factory** per resource, so invalidation is predictable.

```ts
export const weightKeys = {
  all: ["weight"] as const,
  today: (day?: string) =>
    [...weightKeys.all, "today", day ?? "default"] as const,
  list: (range?: { from?: string; to?: string }) =>
    [...weightKeys.all, "list", range ?? {}] as const,
};
```

- After `POST`/`PATCH`/`DELETE` on weight, invalidate `weightKeys.all` (otherwise the Home banner will not reappear after a delete).
- `GET /v1/weight/today` returns `200` with `null` when nothing is logged: that is the normal state that shows the banner, not an error.
- Keep ephemeral UI state (selected exercise, rest timer) out of the query cache. If a store is needed, propose one (e.g. Zustand) and ask before adding it.
- Do not assume the sort order of list responses unless the contract says so: sort client-side.

### 3.4 Optimistic updates (set logging)

Set logging (`POST /v1/session/{session_id}/log/{exercise_id}`) must update the UI immediately.

- Insert the set with a temporary id (`tmp-<uuid>`); on success replace it with the server id; on error roll back and show a retry.
- **Race:** a row with a temporary id must not be editable or deletable until its `POST` resolves (a `PATCH`/`DELETE` would target an id the server does not know).
- Always invalidate the session detail on `onSettled`.
- No persisted mutation queue. Never claim a set is saved until the server confirmed it: show a subtle "pending" state while it is in flight. When offline, show a connection banner.

### 3.5 Error handling

| Status                  | Behavior                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 401                     | Refresh once (single-flight, see §3.2); on failure, logout                                                                                   |
| 403                     | "Not allowed". Should not happen in normal UI flows                                                                                          |
| 404                     | Resource gone: invalidate the relevant queries and navigate back. Exception: `GET /weight/today` and `GET /schedule/today` return `200 null` |
| 409 on `POST /session`  | Another session is already ongoing: fetch it and offer to resume it                                                                          |
| 409 on `POST /weight`   | Already logged for that date: offer to edit (`PATCH`)                                                                                        |
| 409 on `POST /schedule` | Day already has a routine: offer to change it (`PATCH`)                                                                                      |
| 422                     | Show field-level messages. It is also used for some session business rules                                                                   |
| 429                     | Show a "try again in a minute" message. Do not auto-retry (login is 3/min)                                                                   |
| 503                     | Temporary: retry GETs with backoff, show a friendly message                                                                                  |
| Network error / timeout | Connection banner or cold-start state (§3.2)                                                                                                 |

### 3.6 Dates and numbers

- **Local dates:** `new Date().toISOString().slice(0, 10)` returns the UTC date and gives "yesterday" late at night. For `date` fields (weight) always use the local date helper below. The server runs in UTC and accepts the client's local date (max +1 day in the future).
- **`started_at`** is an ISO UTC datetime. Backend rules: not more than 5 min in the future, not older than 24 h. It depends on the device clock.
- **Decimals:** with a European locale the iOS decimal keyboard types `82,5`, and `parseFloat("82,5")` returns `82`. Always parse user input with `parseDecimal`.

```ts
// src/utils/dates.ts
export function toLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// src/utils/numbers.ts
export function parseDecimal(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
```

---

## 4. UI Design System (warm minimal)

> Palette decision (2026-10-03): this palette **replaces** the previous Figma palette. If a Figma frame shows the old colors, these tokens win; mention the discrepancy in your summary.

### 4.1 Tokens

All colors live in `src/theme/tokens.ts`. **No hex literal anywhere else.**

```ts
export const colors = {
  bg: "#17120F",
  surface: "#1F1914",
  surfaceRaised: "#272019",
  border: "#342B23",
  textPrimary: "#F2EAE0",
  textSecondary: "#A89B8C",
  textDisabled: "#6E6459",
  accent: "#B9714F",
  accentPressed: "#9C5C3E",
  onAccent: "#17120F",
  success: "#8AA07A",
  danger: "#C96A5E",
} as const;

export const radius = { sm: 8, md: 12, lg: 16 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
```

### 4.2 Style rules (minimal)

- Dark theme only.
- Neutrals do ~90% of the work. Depth comes from surface steps (`bg` → `surface` → `surfaceRaised`) and 1px `border`, **not** from shadows or gradients.
- `accent` is used only for: primary CTA, active state (nav item, selected day), and progression highlights. At most one primary accent element per screen.
- Text on accent fills uses `onAccent`.
- `success` and `danger` are for states only and are never the sole signal: always pair them with an icon or text.
- Consistent radii and spacing from the scales above. Do not add values ad hoc.

### 4.3 Typography

- **Numbers** (weight, reps, timers, stats): Oswald (condensed).
- **Body and labels:** Work Sans.
- Load fonts via the Expo font tooling; check the docs for the current SDK first (§1). The type scale is not defined in Figma yet: propose one as tokens and mark it `// PROVISIONAL`.

### 4.4 Gym usability

- **Touch targets:** minimum 48x48 pt for all interactive controls (buttons, checkboxes, incrementers).
- **Inputs:** numeric inputs (`weight`, `reps`, `rir`, `rest_time`) use `keyboardType="decimal-pad"` (weight) or `"numeric"` (integers), and parse through `parseDecimal`.
- **Quick plate increments:** stepper pills (`+1.25`, `+2.5`, `+5` in `WEIGHT_UNIT`) for rapid weight adjustment.
- **Haptics:** trigger `expo-haptics` on completing a set and on saving a workout.

---

## 5. Domain rules

- **Set volume:** `volume = weight * reps`
- **Estimated 1RM (Epley):** `1RM = weight * (1 + reps / 30)`
- **Estimated 1RM (Brzycki, reps <= 10):** `1RM = weight * (36 / (37 - reps))`
- **RIR:** integer 0–10; RIR 0 = muscle failure.
- **Bodyweight exercises:** `weight` is the added load and `0` is valid (the backend does not enforce `> 0`). With `weight === 0`, volume and 1RM are 0, so the progression metric is **reps**. Validate on the client that weight is `>= 0` (the backend does not enforce a lower bound).
- **Progressive overload highlight:** when the current set beats the previous performance for the same exercise (weight, volume, estimated 1RM, or reps for bodyweight), highlight the metric with `colors.accent`. "Previous" = the most recent earlier session for that exercise, from `GET /v1/exercises/{id}/stats` (sort by date client-side).
- `GET /v1/routines/{id}/stats` compares the top set of the last two sessions: display what the backend returns, do not recompute it.

---

## 6. Backend REST API contract

Base: `${process.env.EXPO_PUBLIC_API_URL}`. Auth required on everything except register/login/refresh. **If this section and the backend OpenAPI (`/openapi.json`) disagree, OpenAPI wins: flag the mismatch.**

### 6.1 Auth (`/v1/auth`)

- `POST /v1/auth/register` (5/min) — body `{ username, email, password }`; password >= 8 chars with at least 1 digit, 1 uppercase, 1 lowercase. → 201 `AuthOutput`
- `POST /v1/auth/login` (3/min) — body `{ email, password }` → 200 `AuthOutput`
- `POST /v1/auth/refresh` (1/min) — body `{ refresh_token }` → 200 `TokenRefreshOutput`
- `POST /v1/auth/change-password` (2/min) — body `{ new_password }` → 200 `{ message }`
- `POST /v1/auth/reset-password` — exists in the backend; its contract is not documented here, read `/openapi.json` before using it.

### 6.2 Users (`/v1/users`)

- `GET /v1/users/me` → `UserResponse`
- `PATCH /v1/users/me` — body `UserNewInfo` → `UserResponse`

### 6.3 Body weight (`/v1/weight`)

One weight per day per user.

- `GET /v1/weight/today?day=YYYY-MM-DD` (`day` optional, defaults to today) → 200 `WeightLogRead | null`
- `GET /v1/weight?date_from=&date_to=` → `WeightLogRead[]` (date desc)
- `POST /v1/weight` — body `{ weight, date? }`; `date` defaults to server today, max +1 day in the future; `0 < weight <= 500` → 201 `WeightLogRead`. 409 if already logged for that date.
- `PATCH /v1/weight/{log_id}` — body `{ weight }` (only the weight; the date cannot change) → 200 `WeightLogRead`
- `DELETE /v1/weight/{log_id}` → 204. To fix a wrong day: delete and recreate.

### 6.4 Exercises (`/v1/exercises`)

- `GET /v1/exercises/?name=&limit=10&offset=0&muscle_group=` (limit max 100) → `{ exercises: ExerciseRead[] }`
- `GET /v1/exercises/search?query=` (min 3 chars) → `{ results: { exercise, score }[] }`
- `POST /v1/exercises/` — body `ExerciseCreated` → 201 `ExerciseRead`
- `GET /v1/exercises/{exercise_id}` → `ExerciseRead`
- `PATCH /v1/exercises/{exercise_id}` (only custom exercises created by the user) — body `ExerciseModified` → `ExerciseRead`
- `DELETE /v1/exercises/{exercise_id}` (only custom, unreferenced exercises) → 204
- `GET /v1/exercises/{exercise_id}/stats?limit=10&offset=0` → `ExerciseStatsResponse`

### 6.5 Routines (`/v1/routines`)

- `GET /v1/routines/?limit=10&offset=0` → `RoutineListRead[]`
- `GET /v1/routines/{routine_id}` → `RoutineRead`
- `POST /v1/routines/` — body `RoutineCreate` → 201 `RoutineRead`
- `PATCH /v1/routines/{routine_id}` — body `RoutineUpdate` (full state) → `RoutineRead`
- `DELETE /v1/routines/{routine_id}` → 204
- `GET /v1/routines/{routine_id}/stats` → `RoutineStats`

### 6.6 Schedule (`/v1/schedule`)

- `GET /v1/schedule/` → `ScheduleRead[]`
- `GET /v1/schedule/today` → 200 `ScheduleRead | null` (null = rest day)
- `POST /v1/schedule/` — body `ScheduleCreate` → 201 `ScheduleRead`
- `PATCH /v1/schedule/{schedule_id}` — body `ScheduleUpdate` → `ScheduleRead`
- `DELETE /v1/schedule/{schedule_id}` → 204

### 6.7 Sessions & sets (`/v1/session`)

- `GET /v1/session/?offset=0&limit=100` → `SessionRead[]`
- `POST /v1/session/` — body `SessionCreate`; `started_at` not > 5 min in the future nor older than 24 h; status starts as `ongoing`; 409 if another session is already ongoing → 201 `SessionRead`
- `GET /v1/session/{session_id}` → `SessionDetailRead`
- `PATCH /v1/session/{session_id}` — body `SessionUpdate` → `SessionRead`
- `POST /v1/session/{session_id}/log/{exercise_id}` — body `SetLogCreate` → 201 `SetLogRead`
- `PATCH /v1/session/{session_id}/log/{set_id}` — body `SetLogUpdate` → `SetLogRead`
- `DELETE /v1/session/{session_id}/log/{set_id}` → 204

Note: the `log` path takes an `exercise_id` on `POST` but a `set_id` on `PATCH`/`DELETE`.

---

## 7. TypeScript DTOs

Maintain these under `src/types/api.ts`, aligned with the backend (see §6 for the source-of-truth rule).

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
  date?: string; // YYYY-MM-DD (local date)
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
  weight: number; // added load; 0 is valid for bodyweight exercises
  rir: number | null;
}

export interface SessionDetailRead extends SessionRead {
  sets: SetLogRead[];
}

export interface SessionCreate {
  routine_id?: string;
  started_at: string; // ISO datetime (UTC)
}

export interface SessionUpdate {
  status: SessionStatus;
  ended_at?: string;
}

export interface SetLogCreate {
  set_number: number; // > 0
  reps: number; // > 0
  weight: number; // no lower bound enforced by the backend; validate >= 0 on the client
  rir?: number | null; // 0-10
}

export interface SetLogUpdate {
  set_number?: number;
  reps?: number;
  weight?: number;
  rir?: number | null;
}
```

---

## 8. Definition of done

Before declaring any task done:

1. `npx expo lint` and `npx tsc --noEmit` pass.
2. No hex literal outside `src/theme/tokens.ts`; no hardcoded base URL; no raw `fetch` in components.
3. Pure helpers (dates, decimals, token refresh, progression logic) have unit tests.
4. Every mutation handles the error cases of §3.5 and invalidates the right query keys.
5. Anything provisional or ambiguous is listed in the summary, along with any conflict found with this file or the decision log.
