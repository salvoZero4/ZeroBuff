# ZeroBuff Mobile

Expo SDK 58 / React Native app for Today, Routines, Workout, Analytics and Profile. Follow `AGENTS.md` and the root project guidelines before making changes.

## Development

Install dependencies with `npm install`. Configure the backend URL in a local `.env` using `EXPO_PUBLIC_API_URL`, including `/v1`; use an address reachable from your device. Do not commit credentials.

`npm start` starts Metro. Use `npm run ios`, `npm run android` or `npm run web` for the target platform. Native rest notifications and Live Activities require a rebuilt native app; Expo Go cannot load that integration.

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

Workout snapshots retain the existing versioned storage format and serial writer.
The Zustand subscription persists only a changed session reference, excluding actions
and persistence feedback. Hydration stays explicit after authentication, with login/revision
checks; do not replace this with unconditional automatic hydration or persist picker callbacks.

## Active workout recovery

`features/workout/storage/workoutDraftStorage.ts` stores a versioned AsyncStorage
snapshot on each store change, without polling. Local drafts, added sets, navigation,
pause and rest deadlines survive a process restart once the asynchronous write completes.
Authentication restores the snapshot before showing Today; `initOrResumeWorkout` also
checks disk before server recovery or session creation.

The namespace is scoped to the current login and kept in SecureStore across token
refreshes/restarts. Tokens never enter AsyncStorage. Logout, confirmed completion and
active-session deletion clear the snapshot. Interrupted saves/deletions become retryable
errors: an explicit Retry checks server state before another write. No automatic API
replay or offline mutation queue is introduced. Invalid snapshots remain untouched and
show recovery feedback; write failures show a Retry notice in Workout.

AsyncStorage 2.2.0 is the Expo SDK 58-compatible dependency. Existing native development
builds need rebuilding to include it. Test background termination on iOS and Android;
a kill before the latest asynchronous write completes can still lose that last edit.

## Checks

```sh
npx tsc --noEmit
npx expo lint
node --test tests/*.test.cjs
```

The Node suites test the real TypeScript logic with simulated native/network boundaries. They do not certify device behavior; revalidate native and notification flows on a real device.
