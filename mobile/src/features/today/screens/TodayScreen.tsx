import { dateLocale, formatNumber } from "@/shared/i18n/i18n";
import { useTranslation } from "react-i18next";
import { routineKeys } from "@/features/routines/api/queryKeys";
import { scheduleKeys } from "@/features/schedule/api/queryKeys";
import { weightKeys } from "@/features/weight/api/queryKeys";
import { sessionKeys } from "@/features/workout/api/queryKeys";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  RoutineCardSkeleton,
  WeekStripSkeleton,
  WeightBannerSkeleton,
  LastSessionSkeleton,
  ConsistencySkeleton,
} from "@/features/today/components/TodaySkeletons";
import { LoadingNotice } from "@/components/ui/ScreenState";
import { loadErrorMessage } from "@/shared/api/loadError";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView, Text, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { useNetInfo } from "@react-native-community/netinfo";
import { useCachedWorkoutSchedule, useWorkoutRoutine, offlineStartEnabled } from "@/features/workout/storage/useCachedWorkoutData";
import { cacheSchedule, refreshWorkoutCache } from "@/features/workout/storage/workoutCache";
import { useQuery } from "@tanstack/react-query";
import { ConsistencyGrid } from "@/features/analytics/components/ConsistencyGrid";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Section } from "@/components/ui/Section";
import { InfoCard } from "@/features/today/components/InfoCard";
import { LastSessionCard } from "@/features/today/components/LastSessionCard";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { WeekStrip } from "@/features/today/components/WeekStrip";
import { WeightLogModal } from "@/features/weight/components/WeightLogModal";
import { initOrResumeWorkout, workoutErrorMessage } from "@/features/workout/utils/workout";
import { useActiveWorkout } from "@/features/workout/store/activeWorkoutStore";
import { getSchedule } from "@/features/schedule/api/schedule";
import type { DayOfWeek } from "@/features/schedule/types/schedule";
import { getTodayWeight } from "@/features/weight/api/weight";
import type { WeightLogRead } from "@/features/weight/types/weight";
import { getSessions } from "@/features/workout/api/session";
import { getRoutines } from "@/features/routines/api/routines";
import { StartWorkoutPickerModal } from "@/features/today/components/StartWorkoutPickerModal";
import { toLocalDateString } from "@/shared/utils/dates";

const DAY_KEYS: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function SectionLoadError({
  title,
  error,
  retrying,
  onRetry,
}: {
  title: string;
  error: Error;
  retrying: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-sm rounded-md border border-border bg-surface p-md">
      <Text
        accessibilityLiveRegion="polite"
        className="font-body-semibold text-body text-text-primary"
      >
        {title}
      </Text>
      <Text className="font-body text-caption text-text-secondary">
        {t(loadErrorMessage(error))}
      </Text>
      <Button
        variant="outline"
        label={retrying ? t("Retrying…") : t("Try again")}
        accessibilityHint={title}
        disabled={retrying}
        onPress={onRetry}
      />
    </View>
  );
}

export function TodayScreen() {
  const { t } = useTranslation();
  const starting = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [startButtonHeight, setStartButtonHeight] = useState(0);
  const [isRefetching, setIsRefetching] = useState(false);
  const [weightEditor, setWeightEditor] = useState<{
    date: string;
    existingLog: WeightLogRead | null;
  } | null>(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [todayDateStr, setTodayDateStr] = useState(toLocalDateString);

  const todayLongStr = new Intl.DateTimeFormat(dateLocale(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${todayDateStr}T12:00:00`));

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function updateDay() {
      clearTimeout(timeout);
      const now = new Date();
      setTodayDateStr(toLocalDateString(now));
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      timeout = setTimeout(updateDay, nextMidnight.getTime() - now.getTime());
    }
    updateDay();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") updateDay();
    });
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, []);

  const activeSession = useActiveWorkout();
  const network = useNetInfo();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const cachedSchedule = useCachedWorkoutSchedule();

  const {
    data: sessions,
    isPending: pendingSessions,
    isFetching: fetchingSessions,
    error: errorSessions,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: sessionKeys.list({ limit: 64 }),
    queryFn: () => getSessions({ limit: 64 }),
  });

  // Session still open on the server (e.g. the app was closed mid-workout)
  const ongoingSession = useMemo(
    () => sessions?.find((s) => s.status !== "completed"),
    [sessions],
  );

  const {
    data: routineList,
    isPending: pendingRoutines,
    refetch: refetchRoutines,
  } = useQuery({
    queryKey: routineKeys.list(),
    queryFn: () => getRoutines(),
  });
  const routines = useMemo(() => routineList ?? [], [routineList]);


  const {
    data: todayWeight,
    isPending: pendingWeight,
    isFetching: fetchingWeight,
    error: errorWeight,
    refetch: refetchWeight,
  } = useQuery<WeightLogRead | null>({
    queryKey: weightKeys.today(todayDateStr),
    queryFn: () => getTodayWeight(todayDateStr),
  });

  const {
    data: serverSchedule,
    isPending: pendingServerSchedule,
    isFetching: fetchingWeekSchedule,
    error: errorWeekSchedule,
    refetch: refetchWeekSchedule,
  } = useQuery({
    queryKey: scheduleKeys.list(),
    queryFn: () => refreshWorkoutCache("schedule", getSchedule, cacheSchedule),
  });

  const weekSchedule = serverSchedule ?? (offlineStartEnabled ? cachedSchedule.data ?? undefined : undefined);
  const day = DAY_KEYS[(new Date(`${todayDateStr}T12:00:00`).getDay() + 6) % 7];
  const todaySchedule = weekSchedule?.find((item) => item.day_of_week === day)
    ?? (weekSchedule ? null : undefined);
  const scheduledWorkout = useWorkoutRoutine(todaySchedule?.routine_id, Boolean(todaySchedule));
  const pendingWeekSchedule = !weekSchedule && (offline ? cachedSchedule.isLoading : pendingServerSchedule);
  const needsFirstRoutine = routineList?.length === 0 && !todaySchedule;

  const hasCompletedSessionToday = useMemo(() => {
    return sessions?.some(
      (s) => s.status === "completed" && s.date === todayDateStr,
    );
  }, [sessions, todayDateStr]);

  const canResumeWorkout = Boolean(activeSession || (!offline && ongoingSession?.routine_id));
  const loadingWorkout =
    !offline && !canResumeWorkout &&
    (pendingWeekSchedule || (!scheduledWorkout.data && pendingSessions) ||
      (pendingRoutines && !todaySchedule));
  const showStartWorkoutButton =
    canResumeWorkout || (offline ? Boolean(offlineStartEnabled && scheduledWorkout.data?.exercises.length) : needsFirstRoutine || sessions !== undefined || Boolean(scheduledWorkout.data));

  const scheduledRoutine = routines.find(
    (routine) => routine.id === todaySchedule?.routine_id,
  );

  async function handleRefetch() {
    setIsRefetching(true);
    try {
      await Promise.all([
        refetchWeekSchedule(),
        refetchSessions(),
        refetchRoutines(),
        refetchWeight(),
      ]);
    } finally {
      setIsRefetching(false);
    }
  }

  const scheduledDayKeys = new Set(weekSchedule?.map((s) => s.day_of_week));

  const lastCompletedSession = useMemo(() => {
    const completed = sessions?.filter((s) => s.status === "completed");
    if (!completed?.length) return undefined;
    return [...completed].sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )[0];
  }, [sessions]);

  const ongoingRoutineName = useMemo(() => {
    if (!ongoingSession?.routine_id) return null;
    return (
      routines.find((r) => r.id === ongoingSession.routine_id)?.name ?? null
    );
  }, [ongoingSession, routines]);

  const lastSessionRoutineName = useMemo(() => {
    if (!lastCompletedSession) return undefined;
    if (!lastCompletedSession.routine_id) return t("Custom Workout");
    return (
      routines.find((r) => r.id === lastCompletedSession.routine_id)?.name ??
      t("Completed Routine")
    );
  }, [lastCompletedSession, routines, t]);

  async function handleStartWorkout() {
    if (starting.current) return;
    setStartError(null);
    if (activeSession) {
      router.push({
        pathname: "/workout/[routineId]",
        params: { routineId: activeSession.routineId },
      });
      return;
    }

    // Resume the session left open on the server
    if (!offline && ongoingSession?.routine_id) {
      router.push({
        pathname: "/workout/[routineId]",
        params: { routineId: ongoingSession.routine_id },
      });
      return;
    }

    if (needsFirstRoutine && !offline) {
      handleCreateRoutine();
    } else if (scheduledWorkout.data?.exercises.length && (offline ? offlineStartEnabled : !hasCompletedSessionToday)) {
      starting.current = true;
      setIsStarting(true);
      try {
        const workout = await initOrResumeWorkout(scheduledWorkout.data, offline);
        if (workout) {
          router.push({ pathname: "/workout/[routineId]", params: { routineId: workout.routineId } });
        }
      } catch (error) {
        setStartError(workoutErrorMessage(error));
      } finally {
        starting.current = false;
        setIsStarting(false);
      }
    } else if (!offline && todaySchedule && !hasCompletedSessionToday) {
      router.push({ pathname: "/workout/[routineId]", params: { routineId: todaySchedule.routine_id } });
    } else if (!offline) {
      setShowWorkoutPicker(true);
    }
  }

  function handleCreateRoutine() {
    setShowWorkoutPicker(false);
    router.push({
      pathname: "/(tabs)/routines/[routineId]",
      params: { routineId: "new", fromWorkout: "true" },
    });
  }

  const workoutActionLabel = activeSession
    ? t("Resume {{name}}{{pausedLabel}}", {
        name: activeSession.routineName,
        pausedLabel: activeSession.isPaused ? t(" (Paused)") : "",
      })
    : ongoingSession?.routine_id
      ? t("Resume {{name}}", { name: ongoingRoutineName ?? t("workout") })
      : needsFirstRoutine
        ? t("Create your first routine")
        : hasCompletedSessionToday
          ? t("Start another workout")
          : todaySchedule
            ? t("Start workout")
            : t("Choose a workout");

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefetch}
            tintColor="#f5f5f5"
          />
        }
      >
        <ScreenHeader title={t("This week")} subtitle={todayLongStr} />
        <LoadingNotice
          loading={
            !offline && (pendingWeekSchedule || pendingWeight || pendingSessions)
          }
        />

        {pendingWeekSchedule ? (
          <WeekStripSkeleton />
        ) : errorWeekSchedule && !weekSchedule ? (
          <SectionLoadError
            title={t("Week schedule couldn’t load")}
            error={errorWeekSchedule}
            retrying={fetchingWeekSchedule}
            onRetry={() => void refetchWeekSchedule()}
          />
        ) : (
          <WeekStrip
            hasRoutine={(_date, dayIndex) => {
              const dayKey = DAY_KEYS[dayIndex];
              return scheduledDayKeys.has(dayKey);
            }}
          />
        )}

        <Section title={t("Today's routine")}>
          {pendingWeekSchedule ? (
            <RoutineCardSkeleton />
          ) : errorWeekSchedule && todaySchedule === undefined ? (
            <SectionLoadError
              title={t("Today’s routine couldn’t load")}
              error={errorWeekSchedule}
              retrying={fetchingWeekSchedule}
              onRetry={() => void refetchWeekSchedule()}
            />
          ) : offline && todaySchedule === undefined ? (
            <Text className="font-body text-body text-text-secondary">{t("Connect to download this routine.")}</Text>
          ) : todaySchedule ? (
            <InfoCard
              title={todaySchedule.routine_name}
              description={
                offline && !scheduledWorkout.data
                  ? t("Connect to download this routine.")
                  : scheduledRoutine
                  ? t("exerciseCount", {
                      count: scheduledRoutine.exercises_count,
                    })
                  : t("Your scheduled workout for today")
              }
            />
          ) : needsFirstRoutine ? (
            <InfoCard
              title={t("No routines yet")}
              description={t(
                "Add the exercises you want to track in your first workout.",
              )}
            />
          ) : (
            <InfoCard
              title={t("Rest day")}
              description={t("No routine is scheduled for today.")}
            />
          )}
          {hasCompletedSessionToday && (
            <Text className="font-body-semibold text-caption text-text-secondary">
              {t("Workout completed today")}
            </Text>
          )}
        </Section>

        {pendingWeight && !offline ? (
          <WeightBannerSkeleton />
        ) : errorWeight && todayWeight === undefined ? (
          <SectionLoadError
            title={t("Body weight couldn’t load")}
            error={errorWeight}
            retrying={fetchingWeight}
            onRetry={() => void refetchWeight()}
          />
        ) : (
          <View className="flex-row items-center gap-md border-y border-border py-md">
            <View className="flex-1 gap-xs">
              <Text className="font-body-semibold text-body text-text-primary">
                {todayWeight ? t("Today’s weight") : t("Track body weight")}
              </Text>
              <Text className="font-body text-caption leading-5 text-text-secondary">
                {todayWeight
                  ? `${formatNumber(todayWeight.weight, { maximumFractionDigits: 2 })} kg`
                  : t("Keep your progress context up to date.")}
              </Text>
            </View>
            <IconButton
              variant="bare"
              icon={todayWeight ? "pen-to-square" : "plus"}
              iconSize={16}
              label={
                todayWeight ? t("Edit today’s weight") : t("Log body weight")
              }
              onPress={() =>
                setWeightEditor({
                  date: todayDateStr,
                  existingLog: todayWeight ?? null,
                })
              }
            />
          </View>
        )}

        {pendingSessions && !offline ? (
          <ConsistencySkeleton />
        ) : sessions ? (
          <ConsistencyGrid sessions={sessions} mode="recent" framed={false} />
        ) : null}

        <Section title={t("Last session")}>
          {pendingSessions && !offline ? (
            <LastSessionSkeleton />
          ) : errorSessions && !sessions ? (
            <SectionLoadError
              title={t("Workout sessions couldn’t load")}
              error={errorSessions}
              retrying={fetchingSessions}
              onRetry={() => void refetchSessions()}
            />
          ) : (
            <LastSessionCard
              session={lastCompletedSession}
              routineName={lastSessionRoutineName}
            />
          )}
        </Section>

        <Button
          variant="ghost"
          icon="pen-to-square"
          label={t("Edit your schedule")}
          onPress={() => router.push("/schedule")}
        />
        {(loadingWorkout || showStartWorkoutButton) && (
          <View className="mb-md" style={{ height: startButtonHeight }} />
        )}
      </ScrollView>
      {loadingWorkout ? (
        <View
          className="absolute bottom-md left-lg right-lg"
          onLayout={(event) =>
            setStartButtonHeight(event.nativeEvent.layout.height)
          }
        >
          <Skeleton className="h-14 w-full rounded-md" />
        </View>
      ) : (
        showStartWorkoutButton && (
          <View
            className="absolute bottom-md left-lg right-lg"
            onLayout={(event) =>
              setStartButtonHeight(event.nativeEvent.layout.height)
            }
          >
            {startError && (
              <Text accessibilityLiveRegion="polite" className="bg-surface p-sm font-body text-caption text-text-primary">
                {t(startError)}
              </Text>
            )}
            <Button
              variant="primary"
              label={workoutActionLabel}
              disabled={isStarting}
              onPress={() => void handleStartWorkout()}
            />
          </View>
        )
      )}

      {weightEditor && (
        <WeightLogModal
          date={weightEditor.date}
          existingLog={weightEditor.existingLog}
          onClose={() => setWeightEditor(null)}
        />
      )}

      <StartWorkoutPickerModal
        visible={showWorkoutPicker}
        onClose={() => setShowWorkoutPicker(false)}
        onCreateRoutine={handleCreateRoutine}
        onSelectRoutine={(routineId) => {
          router.push({
            pathname: "/workout/[routineId]",
            params: { routineId },
          });
        }}
      />
    </View>
  );
}
