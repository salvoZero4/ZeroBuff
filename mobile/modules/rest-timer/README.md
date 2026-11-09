# Native rest timer with Expo Notifications

## Ownership

- `expo-notifications` owns permissions, Android channel setup, foreground presentation and completion-notification response events. No push token registration or remote notification service is required for local rest alerts.
- Android Kotlin owns the system chronometer and explicit, non-exported +30s/Skip/dismiss receivers. `RestTimerTransitions` validates timer IDs, deadlines and versions. `RestCompletionAlerts` calls the installed Expo native scheduler synchronously so actions work without JS and scheduling errors reach the caller. This narrow integration uses `ExpoSchedulingDelegate`, `NotificationContent`, `NotificationRequest`, and `DateTrigger`: verify their signatures and notification `(tag, id)` mapping when upgrading Expo.
- iOS ActivityKit/SwiftUI and LiveActivityIntent remain native. `RestCompletionAlerts.swift` replaces the single UNUserNotificationCenter request using the same notification queue and data format as Expo. Expo receives taps and controls foreground presentation. No library-specific native headers or extension stub are required.
- `expo-widgets` configures the extension and App Group. `plugins/withRestTimer.js` supplies the native layout; keep it before expo-widgets because dangerous mods execute in reverse registration order. It removes the previous generated Notifee Podfile entry on incremental prebuilds.

Only one pending completion request exists: `zerobuff.rest.complete`. A time adjustment replaces it, while Skip/finish/logout cancel it. Dismissing the countdown preserves the final alert. Cleanup only touches rest notifications. Completed alerts are not removed by foreground reconciliation. Native storage contains timer metadata, not credentials or workout writes.

## Background behavior

No foreground service, app-held wake lock, JS background task or polling. The OS renders countdowns from a deadline. Android actions run briefly in a receiver; iOS actions run in the app process via LiveActivityIntent.

On Android 12+, exact-alarm access is optional. Expo's scheduler uses an inexact idle-aware alarm when permission is unavailable; it may arrive late. The UI links to Alarms & reminders and separately identifies blocked notification channels. Battery restrictions still apply. Never request battery-optimization exemptions automatically.

Android posts the countdown and schedules the completion alert when the app goes to the background. Returning to the app removes the countdown and cancels a pending completion alert. Android 8+ removes the countdown at its deadline with the platform timeout. Android 7 removes the expired countdown on reconciliation or clear. Android 16+ requests promotion using a system Live Update template. Samsung chooses which apps appear in Now Bar based on device support and notification settings.

On iOS 16.4–16.x the Live Activity displays the countdown and opens the workout; buttons require iOS 17+. Expo suppresses the completion notification while the app is visible. At expiry the activity becomes stale. The system may retain it until the workout clears it; no process is kept alive solely to end an activity at expiry.

Force-stop, reboot, user dismissal and energy restrictions must be tested on real devices. Expo restores supported pending alarms on boot; the countdown is reconstructed when the workout is reconciled. Neither platform guarantees delivery after force-stop.

## Build and tests

A new native build is required; this migration cannot be installed by reloading an existing APK. Expo Go does not include the local timer module.

`package.json` forces `expo-notifications` to build from source on Android through
`expo.autolinking.android.buildFromSource`: the Kotlin adapter imports its scheduler
classes, so Gradle needs the `:expo-notifications` project rather than the precompiled AAR.

From `mobile`:

```sh
npx expo prebuild --platform android --no-install
npx expo prebuild --platform ios --no-install
npx expo run:android
npx expo run:ios
node --test tests/*.test.cjs
npx tsc --noEmit
npx expo lint
```

Android state tests are in `tests/RestTimerTransitionsTest.kt` (relative to this module). Run with `kotlinc`, the production `RestTimerTransitions.kt`, and a JVM `org.json` jar on the classpath; run `com.zerobuff.resttimer.RestTimerTransitionsTestKt`. They cover +30, Skip, dismissal, stale/duplicate actions, expiration, replacement and same-state retry.

Swift bridge contract:

```sh
swiftc modules/rest-timer/ios/RestTimerState.swift modules/rest-timer/tests/main.swift -o /tmp/rest-timer-contract
/tmp/rest-timer-contract
```

Device checks: permit/deny notifications, disable individual channels, deny/grant exact alarms, lock the screen, +30 replacing the previous deadline, Skip preventing a late alert, finish/logout cleanup, app restart, notification taps, and dismissal. Check both Android and iOS, including a real Galaxy for promoted presentation.

## Verification for this migration

Passed: 96 Node tests, TypeScript, Swift bridge test, Swift type-check of ActivityKit/widget/notification sources, 17 Android state assertions on the JVM, Android JS bundle export, both native prebuilds and Expo module discovery.

Full Android Gradle compilation is blocked by the missing configured Android SDK. A full iOS app build and real-device notification delivery remain unverified. These checks do not establish lock-screen behavior or energy usage on a phone.
