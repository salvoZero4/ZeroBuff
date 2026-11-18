# ZeroBuff Mobile

Expo SDK 58 / React Native app for Today, Routines, Workout, Analytics and Profile. Follow `AGENTS.md` and the root project guidelines before making changes.

## Development

Install dependencies with `npm install`. Set `EXPO_PUBLIC_API_URL` in a local `.env` to a backend address reachable from your device. The mobile client adds `/v1`. Do not commit credentials.

`npm start` starts Metro. Use `npm run ios`, `npm run android` or `npm run web` for the target platform. Native rest notifications and Live Activities require a rebuilt native app; Expo Go cannot load that integration.

## Builds

`eas.json` contains the EAS build profiles. The API URL is not stored in the repository: it is provided by the `EXPO_PUBLIC_API_URL` environment variable for the `preview` and `production` EAS environments.

Set it once with:

```sh
npx eas-cli env:set --name EXPO_PUBLIC_API_URL \
  --value https://your-api.example.com \
  --environment preview --visibility plaintext

npx eas-cli env:set --name EXPO_PUBLIC_API_URL \
  --value https://your-api.example.com \
  --environment production --visibility plaintext
```

For local builds, Expo reads `EXPO_PUBLIC_API_URL` from `mobile/.env`. Existing URLs ending in `/v1` are also supported.

## Structure

- `index.js`: registers Expo notification handlers before Expo Router.
- `src/app/`: route adapters and navigation layouts.
- `src/features/`: feature-owned UI, APIs, contracts and state.
- `src/features/workout/notifications/`: Expo notification integration, permissions and native timer synchronization.
- `src/components/ui/`: shared UI primitives.
- `src/shared/`: API transport, query cache, errors and utilities.
- `modules/rest-timer/`: Swift/Kotlin timer integration discovered by autolinking.
- `plugins/withRestTimer.js`: generates the Live Activity extension and removes legacy Notifee entries from incremental prebuilds.

Do not edit generated `ios/` and `android/` files by hand. Native build details and platform limits are documented in [the rest timer module](modules/rest-timer/README.md).

## Query cache conventions

Each server resource owns `api/queryKeys.ts`: routineKeys, sessionKeys, exerciseKeys,
scheduleKeys, weightKeys and userKeys. Import the factory from its owning feature,
including when reading the same resource from another feature. Do not write inline keys.

Use `all` for resource-wide invalidation, `lists()` for all paginated lists,
`list(params)` for a specific request and `detail(id)` for a single record.
Include every request filter in the key. Infinite exercise queries have a separate
`infiniteList(params)` branch; their changing offset stays in `pageParam`.

After completing a workout, update all session lists with `setQueriesData` using
`sessionKeys.lists()`. Invalidate those lists and the affected session detail;
set changes also invalidate `exerciseKeys.stats(exerciseId)`. Weight mutations
invalidate `weightKeys.all`, covering every date and range. Auth continues to
clear the complete cache when the account changes.

## Client state (Zustand)

Feature-owned vanilla stores keep local interaction state separate from server data:

- `features/workout/store/activeWorkoutStore.ts`: active session, persistence feedback
  and synchronous actions. Use `useActiveWorkoutStore(selector)` in React; async
  operations and native events use stable exported actions or `getActiveWorkout()`.
- `features/exercises/store/exercisePickerStore.ts`: pending callback and open/select/clear
  actions. Selection is consumed before calling the recipient; callbacks stay in memory.
- `features/workout/types/activeWorkout.ts`: shared contracts for store, persistence and UI.

Selectors should return a primitive or a stable object. For several fields use
`useShallow`; the notification provider selects only timer metadata and Analytics
selects only the active session ID. API reads/writes stay in feature APIs and TanStack Query.

## Offline workouts

On iOS and Android, SQLite stores the routine snapshot, the active workout, and
completed workouts awaiting sync. Zustand exposes the active workout to the UI.
Finish moves the draft into the queue in one database write. The app keeps the
queued row until the server acknowledges its UUID, then refreshes session history.
Queue rows are scoped to the account and survive logout and process restarts.

Today can start a workout offline when the schedule and routine are cached.
Set `EXPO_PUBLIC_OFFLINE_START=false` when building a version that enables offline
resume and finish while requiring a connection for Start. Deploy the backend sync
endpoint before distributing a build that uses it.

The web client and workouts started in older builds use the legacy online flow.
Legacy AsyncStorage drafts are restored for the existing login. Credentials are
kept in SecureStore.

## Checks

```sh
npx tsc --noEmit
npx expo lint
node --test tests/*.test.cjs
```

The Node suites exercise the TypeScript logic, including the workout SQL against SQLite and retries against a simulated network. They do not certify device behavior; revalidate native and notification flows on a real device.
