# Workout notifications

This folder owns the app-side rest notification integration.

- `BackgroundRestTimerProvider.tsx`: session/auth lifecycle, Notifee permission feedback, foreground reconciliation and opening workouts.
- `restTimerSync.ts`: platform-independent identity/version checks and serialized synchronization.
- `nativeRestTimer.ts`: optional native bridge; Expo Go/web degrade safely.
- `notifeeRestTimer.ts`: Notifee countdown, scoped trigger cleanup, native-action dispatch and a shared foreground/background operation queue.
- `notifeeRuntime.ts`: one-time Notifee event registration and deferred notification presses before auth is restored.
- `mobile/index.js` registers the runtime before `expo-router/entry`, so Android Headless JS can process actions without React being mounted.

`components/RestTimerControl.tsx` owns the visible timer. `utils/foregroundTicker.ts` serves both rest and total workout time and stays independent of notifications.

Android Notifee notifications use the system chronometer, one timestamp trigger, and +30s/Skip actions without a foreground service. Native Kotlin stores one timer's metadata, rejects obsolete actions and requests promoted ongoing visibility on API 36+. iOS ActivityKit/LiveActivityIntent remain native; their standard completion alert uses Notifee's native core directly to avoid starting JS for a Live Activity button.

Native code remains in `mobile/modules/rest-timer/` for autolinking. `mobile/plugins/withRestTimer.js` configures the iOS extension and modular Notifee headers. Notifee 9.1.8 does not ship the app.plugin.js described in its online installation guide: use autolinking and the local plugin, not a nonexistent @notifee/react-native config-plugin entry.

See the native module README for build instructions, energy behavior and unverified device scenarios.
