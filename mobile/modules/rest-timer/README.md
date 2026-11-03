# Background rest timer with Notifee and native Live Activities

The app integration is grouped in `src/features/workout/notifications/`. Standard notifications are owned by `@notifee/react-native`; `expo-notifications` is removed.

## Responsibilities

- **Android:** Notifee owns channels, the system chronometer, timestamp trigger, notification actions and press events. Kotlin only retains timer metadata/version checks and promotes the Notifee notification on API 36+. No custom native notification builder, alarm receiver or alarm scheduling remains.
- **iOS:** ActivityKit and SwiftUI remain native. LiveActivityIntent updates/cancels the completion alert through Notifee's native core, without starting JS. `ios/NotifeeRestAlerts.swift` uses the public native headers shipped in Notifee 9.1.8. The extension contains a rendering-only stub: LiveActivityIntent executes in the app process where the real core adapter is linked.
- `expo-widgets` configures the extension target and App Group. `plugins/withRestTimer.js` supplies the native layout and enables modular Notifee headers for Swift. Keep it **before** expo-widgets: dangerous mods execute in reverse registration order.
- `index.js` registers Notifee events before Expo Router. Expo Go and web do not load the native Notifee emitter.

Notifee 9.1.8's package does not contain the config plugin described in its online guide. Native modules are autolinked; no @notifee/react-native entry belongs in app.json's plugins array for this version. The local module manifest supplies notification/exact-alarm/promoted permissions.

## Energy model

- No permanent foreground service, app-held wake lock, background polling, background fetch or remote push subscription.
- The OS renders countdowns from the deadline; app counters stop in inactive/background states and at expiry/pause.
- Only one expiry trigger. Changes replace it, and Skip/finish/logout cancel it. Notification cleanup is scoped to rest alerts, preserving other features' notifications.
- Android Headless JS runs briefly on an action/completion event, with no network calls or periodic scheduling. iOS Live Activity actions remain entirely native.
- Exact-alarm access is optional. Without it, Notifee uses SET_AND_ALLOW_WHILE_IDLE rather than exact alarms or repeating WorkManager jobs. Battery restrictions may delay the alert; the in-app timer remains available. Never request battery-optimization exemptions.
- Native storage holds a single timer's metadata only, not credentials or workout mutation queues.

## Behavior and platform limits

Rest IDs and versions reject obsolete actions; foreground and background Notifee operations share a queue. Native iOS mutations are serialized separately. Reconcile on foreground and after the server restores the same workout.

On iOS 16.4–16.x the Live Activity displays a countdown and opens the workout; buttons require iOS 17+. At expiry the countdown reaches zero and the stale presentation says Rest complete. The app ends the activity on return, Skip or workout completion; no process is kept alive solely to close it at expiry.

On Android API 36+, the small native promotion adapter recovers the Notifee notification and requests promoted ongoing visibility. The id/hash mapping was checked against the Android core bundled with Notifee 9.1.8; reverify it on library upgrades. System/OEM/user settings still control actual promotion and Samsung Now Bar eligibility.

Force-stop, reboot, dismissal and power restrictions differ by OS. Do not promise identical behavior or universal Now Bar support.

## Build and verify

Expo Go cannot load the integration. Regenerate the native project and rebuild with the project's local or development build workflow:

- `npx expo prebuild --platform ios --no-install`
- `npx expo prebuild --platform android --no-install`
- `npx expo run:ios` (CocoaPods/Xcode required)
- `npx expo run:android` (Android SDK required)
- `node --test tests/workout.test.cjs tests/restTimerSync.test.cjs tests/notifeeRestTimer.test.cjs`
- `npx tsc --noEmit` and `npx expo lint`
- Swift JSON contract: compile `ios/RestTimerState.swift` with `tests/main.swift` using swiftc.

Device checks: permission refusal, disabled Live Activities, background/lock countdown, +30 replacing the old deadline, Skip preventing a late alert, confirmed finish/logout cleanup, restore, stale/repeated actions, notification taps and user dismissal. Test Dynamic Island/non-Island iPhones and a real Galaxy/One UI version. Measure power with native profiling tools before making quantitative battery claims.

## Verification on 2026-11-03

51 current Node tests (the retired increment-helper test was removed during cleanup), TypeScript and lint; iOS JS bundle export; native Swift Notifee adapter type-check against the installed public ObjC header; and the arm64 simulator Live Activity extension build passed. Native app integration remains unverified on-device. Android compilation is blocked by the missing Android SDK in this environment; actual Galaxy Now Bar behavior and power consumption remain unmeasured.
