import { useShallow } from "zustand/react/shallow";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/provider/AuthProvider";
import {
  useActiveWorkoutStore,
  getActiveWorkout,
  clearActiveWorkout,
  applyNativeRestTimer,
} from "@/features/workout/store/activeWorkoutStore";
import { getRestTimerRuntime } from "./restNotificationsRuntime";
import {
  matchesRestNotification,
  hasNotificationPermission,
  REST_COMPLETE_CHANNEL,
  REST_RUNNING_CHANNEL,
  type RestNotificationData,
} from "./expoRestNotifications";
import { nativeRestTimer } from "@/features/workout/notifications/nativeRestTimer";
import {
  parseNativeTimer,
  RestTimerSync,
} from "@/features/workout/notifications/restTimerSync";

const Feedback = createContext<{
  message: string | null;
  onAction?: () => void;
  actionLabel?: string;
}>({ message: null });
export const useBackgroundRestTimerFeedback = () => useContext(Feedback);

export function BackgroundRestTimerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();
  const session = useActiveWorkoutStore(
    useShallow((state) =>
      state.session
        ? {
            routineId: state.session.routineId,
            routineName: state.session.routineName,
            startedAtTimestamp: state.session.startedAtTimestamp,
            restTimerId: state.session.restTimerId,
            restEndTimestamp: state.session.restEndTimestamp,
          }
        : null,
    ),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [exactPermission, setExactPermission] = useState(false);
  const [failed, setFailed] = useState(false);
  const bridge = nativeRestTimer;
  const [runtime] = useState(getRestTimerRuntime);
  const [sync] = useState(() => {
    if (!bridge || !runtime) return null;
    let askedPermission = false;
    return new RestTimerSync(
      {
        ...runtime.adapter,
        authorize: async () => {
          setFailed(false);
          await runtime.prepare();
          let permissions = await runtime.api.getPermissionsAsync();
          if (
            !hasNotificationPermission(permissions) &&
            permissions.canAskAgain &&
            !askedPermission &&
            AppState.currentState === "active"
          ) {
            askedPermission = true;
            permissions = await runtime.api.requestPermissionsAsync({
              ios: { allowAlert: true, allowSound: true, allowBadge: false },
            });
          }
          const granted = hasNotificationPermission(permissions);
          const exact =
            Platform.OS === "android" &&
            !(await bridge.canScheduleExactAlarms?.());
          const blockedChannel =
            Platform.OS === "android" &&
            granted &&
            (
              await Promise.all(
                [REST_RUNNING_CHANNEL, REST_COMPLETE_CHANNEL].map((id) =>
                  runtime.api.getNotificationChannelAsync(id),
                ),
              )
            ).some(
              (channel) =>
                channel?.importance === runtime.api.AndroidImportance.NONE,
            );
          setExactPermission(granted && exact && !blockedChannel);
          setMessage(
            !granted
              ? "Allow notifications for rest alerts outside the app."
              : blockedChannel
                ? "Enable Rest countdown and Rest complete in notification settings."
                : Platform.OS === "ios" && !bridge.canShowLiveActivity()
                  ? "Enable Live Activities in Settings to see your rest countdown outside the app."
                  : exact
                    ? "Allow Alarms & reminders for more precise rest alerts. Battery saving may still delay them."
                    : null,
          );
        },
      },
      applyNativeRestTimer,
      (error) => {
        console.error("[RestTimer] Notification update failed", error);
        setFailed(true);
        setMessage("Rest alerts couldn’t update. The timer still works here.");
      },
    );
  });

  useEffect(() => {
    if (status === "loading") return;
    if (status === "signedOut") {
      clearActiveWorkout();
      void sync?.update(null);
      return;
    }
    if (!session) return;
    if (!sync) return;
    void sync.update({
      workoutKey: `${session.routineId}:${session.startedAtTimestamp}`,
      routineId: session.routineId,
      title: session.routineName,
      id: session.restTimerId ?? null,
      endAt: session.restEndTimestamp ?? null,
    });
  }, [
    status,
    session?.routineId,
    session?.startedAtTimestamp,
    session?.restTimerId,
    session?.restEndTimestamp,
    session?.routineName,
    session,
    sync,
    bridge,
  ]);

  // Clear after a real session ends; on cold launch, leave the native timer intact
  // until its workout is restored. This is timer recovery, not offline workout sync.
  const previousSession = useRef(false);
  useEffect(() => {
    if (session) previousSession.current = true;
    else if (previousSession.current) {
      previousSession.current = false;
      void sync?.update(null);
    }
  }, [session, sync, previousSession]);

  useEffect(() => {
    if (!sync || !bridge || status !== "signedIn") return;
    const changed = bridge.addListener("onRestTimerChanged", () => {
      void sync.refresh();
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void sync.refresh().then(() => sync.retry());
      }
    });
    let disposed = false;
    const open = async (notification: RestNotificationData) => {
      if (disposed) return;
      const current = parseNativeTimer(await bridge.getState());
      if (
        !matchesRestNotification(notification, current) ||
        !current ||
        disposed
      )
        return;
      const active = getActiveWorkout();
      if (
        active &&
        `${active.routineId}:${active.startedAtTimestamp}` !==
          current.workoutKey
      )
        return;
      router.navigate({
        pathname: "/workout/[routineId]",
        params: { routineId: current.routineId },
      });
    };
    const removePress = runtime?.subscribePress((notification) => {
      void open(notification).catch(() => {});
    });
    return () => {
      disposed = true;
      changed.remove();
      appState.remove();
      removePress?.();
    };
  }, [sync, status, bridge, runtime]);

  return (
    <Feedback.Provider
      value={{
        message:
          !bridge && session?.restEndTimestamp
            ? "Background rest timer isn’t available in this version of ZeroBuff."
            : message,
        actionLabel: failed ? "Try again" : "Open settings",
        onAction:
          failed && sync
            ? () => {
                void sync.retry();
              }
            : bridge
              ? () => {
                  if (exactPermission) void bridge.openAlarmSettings?.();
                  else void Linking.openSettings();
                }
              : undefined,
      }}
    >
      {children}
    </Feedback.Provider>
  );
}
