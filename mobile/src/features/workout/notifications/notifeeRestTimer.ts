import type { Event, Notification } from "@notifee/react-native";
import type { NativeRestTimerModule } from "./nativeRestTimer";
import { parseNativeTimer, type NativeRestTimer } from "./restTimerSync";

type API = typeof import("@notifee/react-native").default;
type Constants = Pick<
  typeof import("@notifee/react-native"),
  | "EventType"
  | "AlarmType"
  | "AndroidImportance"
  | "AndroidVisibility"
  | "AndroidNotificationSetting"
  | "AuthorizationStatus"
  | "TriggerType"
>;
export const RUNNING_NOTIFICATION = "zerobuff.rest.running";
const COMPLETE_PREFIX = "zerobuff.rest.complete.";

export function matchesRestNotification(
  notification: Notification,
  state: NativeRestTimer | null,
): boolean {
  const data = notification.data;
  return (
    !!state &&
    state.status !== "skipped" &&
    data?.kind === "rest-timer" &&
    data.timerId === state.id &&
    data.routineId === state.routineId &&
    (data.endAt === undefined || Number(data.endAt) === state.endAt)
  );
}

// A single queue is shared by foreground updates and Headless JS actions.
// No timers, foreground service, network or React context is needed here.
export function createNotifeeRestTimer(
  bridge: NativeRestTimerModule,
  api: API,
  constants: Constants,
  platform: string,
  now = Date.now,
) {
  let tail: Promise<unknown> = Promise.resolve();
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = tail.then(operation);
    tail = next.catch(() => {});
    return next;
  };
  const cleanup = async (keepRunning = false) => {
    const [triggers, displayed] = await Promise.all([
      api.getTriggerNotifications(),
      api.getDisplayedNotifications(),
    ]);
    const ids = new Set<string>(keepRunning ? [] : [RUNNING_NOTIFICATION]);
    for (const { notification } of [...triggers, ...displayed]) {
      if (
        notification.data?.kind === "rest-timer" &&
        notification.id &&
        !(keepRunning && notification.id === RUNNING_NOTIFICATION)
      )
        ids.add(notification.id);
    }
    await Promise.all([...ids].map((id) => api.cancelNotification(id)));
  };
  const publish = async (state: NativeRestTimer) => {
    await cleanup(
      state.status === "active" &&
        state.endAt > now() &&
        !state.surfaceDismissed,
    );
    if (state.status !== "active" || state.endAt <= now()) return;
    const settings = await api.getNotificationSettings();
    if (
      settings.authorizationStatus < constants.AuthorizationStatus.AUTHORIZED
    ) {
      await api.cancelNotification(RUNNING_NOTIFICATION);
      return;
    }
    await api.createChannel({
      id: "zerobuff.rest.ongoing",
      name: "Rest countdown",
      importance: constants.AndroidImportance.LOW,
      vibration: false,
    });
    await api.createChannel({
      id: "zerobuff.rest.complete",
      name: "Rest complete",
      importance: constants.AndroidImportance.DEFAULT,
      sound: "default",
    });
    const data = {
      kind: "rest-timer",
      timerId: state.id,
      routineId: state.routineId,
      version: String(state.version),
      endAt: String(state.endAt),
    };
    const completeId = `${COMPLETE_PREFIX}${state.id}.${state.version}`;
    await api.createTriggerNotification(
      {
        id: completeId,
        title: "Rest complete",
        body: "Your next set is ready.",
        data: { ...data, role: "complete" },
        android: {
          channelId: "zerobuff.rest.complete",
          smallIcon: "zerobuff_rest_timer",
          autoCancel: true,
          sound: "default",
          timeoutAfter: 60_000,
          pressAction: { id: "open-workout", launchActivity: "default" },
        },
      },
      {
        type: constants.TriggerType.TIMESTAMP,
        timestamp: state.endAt,
        alarmManager: {
          type:
            settings.android.alarm ===
            constants.AndroidNotificationSetting.ENABLED
              ? constants.AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE
              : constants.AlarmType.SET_AND_ALLOW_WHILE_IDLE,
        },
      },
    );
    if (state.surfaceDismissed) return;
    await api.displayNotification({
      id: RUNNING_NOTIFICATION,
      title: state.title,
      body: "Resting",
      data: { ...data, role: "running" },
      android: {
        channelId: "zerobuff.rest.ongoing",
        smallIcon: "zerobuff_rest_timer",
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        defaults: [],
        importance: constants.AndroidImportance.LOW,
        visibility: constants.AndroidVisibility.PUBLIC,
        showTimestamp: true,
        showChronometer: true,
        chronometerDirection: "down",
        timestamp: state.endAt,
        timeoutAfter: Math.max(1, state.endAt - now()),
        pressAction: { id: "open-workout", launchActivity: "default" },
        actions: [
          { title: "Skip rest", pressAction: { id: "skip-rest" } },
          { title: "+30s", pressAction: { id: "add-rest-time" } },
        ],
      },
    });
    await bridge.promoteNotification?.(RUNNING_NOTIFICATION);
  };

  const adapter = {
    getState: () => bridge.getState(),
    setTimer: (json: string, version: number) =>
      serial(async () => {
        const result = await bridge.setTimer(json, version);
        const state = parseNativeTimer(result);
        if (platform === "android" && state) await publish(state);
        return result;
      }),
    clear: () =>
      serial(async () => {
        await bridge.clear();
        if (platform === "android") await cleanup();
      }),
  };

  const handleEvent = (event: Event): Promise<void> =>
    serial(async () => {
      if (platform !== "android") return; // iOS AppIntents handle Live Activity actions natively.
      const notification = event.detail.notification;
      const current = parseNativeTimer(await bridge.getState());
      if (!notification || !matchesRestNotification(notification, current))
        return;
      const data = notification.data!;
      let action: string | undefined;
      if (event.type === constants.EventType.ACTION_PRESS) {
        action =
          event.detail.pressAction?.id === "skip-rest"
            ? "skip"
            : event.detail.pressAction?.id === "add-rest-time"
              ? "add"
              : undefined;
      } else if (
        event.type === constants.EventType.DISMISSED &&
        data.role === "running"
      )
        action = "dismiss";
      else if (
        event.type === constants.EventType.DELIVERED &&
        data.role === "complete"
      )
        action = "complete";
      if (!action || !bridge.performAction) return;
      const result = parseNativeTimer(
        await bridge.performAction(
          action,
          String(data.timerId),
          Number(data.version),
        ),
      );
      if (!result) return; // Native compare-and-set rejected an obsolete or repeated action.
      if (action === "complete")
        await api.cancelDisplayedNotification(RUNNING_NOTIFICATION);
      else await publish(result);
    });
  return { adapter, handleEvent };
}
