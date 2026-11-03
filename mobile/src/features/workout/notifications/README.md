# Workout notifications

- `BackgroundRestTimerProvider.tsx`: session/auth lifecycle, Expo permissions, blocked-channel feedback, foreground reconciliation and completion-notification navigation.
- `restTimerSync.ts`: identity/version checks and serialized synchronization. Explicit retries republish active timers, including when metadata was saved before notification delivery failed. Completed alerts are preserved.
- `nativeRestTimer.ts`: optional native bridge; Expo Go/web degrade safely.
- `expoRestNotifications.ts`: Expo channels, permission interpretation and deduplicated cold/live response subscriptions. Taps are matched to the current timer and deadline.
- `restNotificationsRuntime.ts`: guarded Expo loading and presentation handler, registered before Expo Router in `index.js`.

`components/RestTimerControl.tsx` owns the visible timer. `utils/foregroundTicker.ts` keeps in-app counters independent of background notifications.

Expo Notifications owns standard notification permissions, presentation and response events. The local native module owns timer metadata, countdown surfaces and +30s/Skip so actions do not require JavaScript. Android's completion adapter uses Expo's native scheduler; iOS uses the same UNUserNotificationCenter queue as Expo. There is one completion request, replaced by identifier on changes. JS never schedules a competing timer alert.

See `modules/rest-timer/README.md` for native integration details, build instructions and device checks.
