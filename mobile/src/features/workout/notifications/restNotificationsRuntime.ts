import { Platform } from "react-native";
import { nativeRestTimer } from "./nativeRestTimer";
import { createExpoRestNotifications } from "./expoRestNotifications";

let runtime: ReturnType<typeof createRuntime> | undefined;
function createRuntime() {
  // Do not load native notification emitters on web or in unsupported builds.
  const api =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Guarded native module load.
    require("expo-notifications") as typeof import("expo-notifications");
  api.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  return {
    api,
    ...createExpoRestNotifications(api, Platform.OS),
    adapter: {
      getState: () => nativeRestTimer!.getState(),
      setTimer: (json: string, version: number) =>
        nativeRestTimer!.setTimer(json, version),
      clear: () => nativeRestTimer!.clear(),
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
