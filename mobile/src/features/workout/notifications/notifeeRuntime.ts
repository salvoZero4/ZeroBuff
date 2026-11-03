import { Platform } from "react-native";
import type { Notification } from "@notifee/react-native";
import { nativeRestTimer } from "./nativeRestTimer";
import { createNotifeeRestTimer } from "./notifeeRestTimer";

let runtime: ReturnType<typeof createRuntime> | undefined;
function createRuntime() {
  // Avoid loading Notifee's native emitter in Expo Go or on web.
  const library =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Register synchronously, only when native modules are available.
    require("@notifee/react-native") as typeof import("@notifee/react-native");
  const api = library.default;
  const timer = createNotifeeRestTimer(
    nativeRestTimer!,
    api,
    library,
    Platform.OS,
  );
  let pendingPress: Notification | undefined;
  const presses = new Set<(notification: Notification) => void>();
  api.onBackgroundEvent(timer.handleEvent);
  api.onForegroundEvent((event) => {
    void timer.handleEvent(event).catch(() => {});
    if (event.type === library.EventType.PRESS && event.detail.notification) {
      if (presses.size)
        for (const listener of presses) listener(event.detail.notification);
      else pendingPress = event.detail.notification;
    }
  });
  return {
    ...timer,
    api,
    constants: library,
    subscribePress(listener: (notification: Notification) => void) {
      presses.add(listener);
      if (pendingPress) {
        const notification = pendingPress;
        pendingPress = undefined;
        void Promise.resolve().then(() => {
          if (presses.has(listener)) listener(notification);
        });
      }
      return () => {
        presses.delete(listener);
      };
    },
  };
}
export function getRestTimerRuntime() {
  if (!nativeRestTimer) return null;
  return (runtime ??= createRuntime());
}
export function registerRestTimerNotifications() {
  getRestTimerRuntime();
}
