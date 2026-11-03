import type * as Notifications from "expo-notifications";
import type { NativeRestTimer } from "./restTimerSync";

type API = typeof Notifications;
export type RestNotificationData = Record<string, unknown>;
export const REST_COMPLETE_CHANNEL = "zerobuff.rest.complete";
export const REST_RUNNING_CHANNEL = "zerobuff.rest.ongoing";

export function matchesRestNotification(
  data: RestNotificationData,
  state: NativeRestTimer | null,
): boolean {
  return (
    !!state &&
    state.status !== "skipped" &&
    data.kind === "rest-timer" &&
    data.timerId === state.id &&
    data.routineId === state.routineId &&
    (data.endAt === undefined || Number(data.endAt) === state.endAt)
  );
}

export function hasNotificationPermission(
  permissions: Notifications.NotificationPermissionsStatus,
) {
  // iOS provisional permission permits quiet delivery.
  return permissions.granted || permissions.ios?.status === 3;
}

export function createExpoRestNotifications(api: API, platform: string) {
  const prepare = async () => {
    if (platform !== "android") return;
    // Android channels must exist before requesting POST_NOTIFICATIONS.
    await api.setNotificationChannelAsync(REST_RUNNING_CHANNEL, {
      name: "Rest countdown",
      importance: api.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
    });
    await api.setNotificationChannelAsync(REST_COMPLETE_CHANNEL, {
      name: "Rest complete",
      importance: api.AndroidImportance.DEFAULT,
      sound: "default",
    });
  };
  const subscribePress = (listener: (data: RestNotificationData) => void) => {
    let disposed = false;
    const seen = new Set<string>();
    const accept = (response: Notifications.NotificationResponse | null) => {
      if (
        disposed ||
        !response ||
        response.actionIdentifier !== api.DEFAULT_ACTION_IDENTIFIER
      )
        return;
      const { identifier, content } = response.notification.request;
      const data = content.data;
      if (data?.kind !== "rest-timer") return;
      const key = JSON.stringify([
        identifier,
        data.timerId,
        data.version,
        data.endAt,
      ]);
      if (seen.has(key)) return;
      seen.add(key);
      listener(data);
    };
    const subscription = api.addNotificationResponseReceivedListener(accept);
    void api
      .getLastNotificationResponseAsync()
      .then(accept)
      .catch(() => {});
    return () => {
      disposed = true;
      subscription.remove();
    };
  };
  return { prepare, subscribePress };
}
