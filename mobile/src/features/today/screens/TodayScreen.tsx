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
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
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
import { useActiveWorkout } from "@/features/workout/store/activeWorkoutStore";
import {
  getSchedule,
  getTodaySchedule,
} from "@/features/schedule/api/schedule";
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
  return (
    <View className="gap-sm rounded-md border border-border bg-surface p-md">
      <Text accessibilityLiveRegion="polite" className="font-body-semibold text-body text-text-primary">
        {title}
      </Text>
      <Text className="font-body text-caption text-text-secondary">
        {loadErrorMessage(error)}
      </Text>
      <Button
        variant="outline"
        label={retrying ? "Retrying…" : "Try again"}
        accessibilityHint={title}
        disabled={retrying}
        onPress={onRetry}
      />
    </View>
  );
}

export function TodayScreen() {
  const [startButtonHeight, setStartButtonHeight] = useState(0);
  const [isRefetching, setIsRefetching] = useState(false);
  const [showBodyWeightModal, setShowBodyWeightModal] = useState(false);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);

  const todayLongStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const todayDateStr = toLocalDateString();

  const activeSession = useActiveWorkout();

  const {
    data: todaySchedule,
    isPending: pendingTodaySchedule,
    isFetching: fetchingTodaySchedule,
    error: errorTodaySchedule,
    refetch: refetchTodaySchedule,
  } = useQuery({
    queryKey: scheduleKeys.today(),
    queryFn: getTodaySchedule,
  });

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
    data: routines = [],
    refetch: refetchRoutines,
  } = useQuery({
    queryKey: routineKeys.list(),
    queryFn: () => getRoutines(),
  });

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
    data: weekSchedule,
    isPending: pendingWeekSchedule,
    isFetching: fetchingWeekSchedule,
    error: errorWeekSchedule,
    refetch: refetchWeekSchedule,
  } = useQuery({
    queryKey: scheduleKeys.list(),
    queryFn: getSchedule,
  });

  const hasCompletedSessionToday = useMemo(() => {
    return sessions?.some(
      (s) => s.status === "completed" && s.date === todayDateStr,
    );
  }, [sessions, todayDateStr]);

  const canResumeWorkout = Boolean(activeSession || ongoingSession?.routine_id);
  const loadingWorkout = !canResumeWorkout &&
    (pendingSessions || pendingTodaySchedule);
  const showStartWorkoutButton =
    canResumeWorkout || (sessions !== undefined && !hasCompletedSessionToday);

  const scheduledRoutine = routines.find(
    (routine) => routine.id === todaySchedule?.routine_id,
  );

  async function handleRefetch() {
    setIsRefetching(true);
    try {
      await Promise.all([
        refetchTodaySchedule(),
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
    if (!lastCompletedSession.routine_id) return "Custom Workout";
    return (
      routines.find((r) => r.id === lastCompletedSession.routine_id)?.name ??
      "Completed Routine"
    );
  }, [lastCompletedSession, routines]);

  function handleStartWorkout() {
    if (activeSession) {
      router.push({
        pathname: "/workout/[routineId]",
        params: { routineId: activeSession.routineId },
      });
      return;
    }

    // Resume the session left open on the server
    if (ongoingSession?.routine_id) {
      router.push({
        pathname: "/workout/[routineId]",
        params: { routineId: ongoingSession.routine_id },
      });
      return;
    }

    if (!sessions) return;

    if (todaySchedule) {
      router.push({
        pathname: "/workout/[routineId]",
        params: { routineId: todaySchedule.routine_id },
      });
    } else {
      setShowWorkoutPicker(true);
    }
  }

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
        <ScreenHeader title="This week" subtitle={todayLongStr} />
        <LoadingNotice
          loading={
            pendingWeekSchedule ||
            pendingTodaySchedule ||
            pendingWeight ||
            pendingSessions
          }
        />

        {pendingWeekSchedule ? (
          <WeekStripSkeleton />
        ) : errorWeekSchedule && !weekSchedule ? (
          <SectionLoadError
            title="Week schedule couldn’t load"
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

        <Section title="Today's routine">
          {pendingTodaySchedule ? (
            <RoutineCardSkeleton />
          ) : errorTodaySchedule && todaySchedule === undefined ? (
            <SectionLoadError
              title="Today’s routine couldn’t load"
              error={errorTodaySchedule}
              retrying={fetchingTodaySchedule}
              onRetry={() => void refetchTodaySchedule()}
            />
          ) : todaySchedule ? (
            <InfoCard
              title={todaySchedule.routine_name}
              description={
                scheduledRoutine
                  ? `${scheduledRoutine.exercises_count} ${scheduledRoutine.exercises_count === 1 ? "exercise" : "exercises"}`
                  : "Your scheduled workout for today"
              }
            />
          ) : (
            <InfoCard
              title="Rest day"
              description="No routine is scheduled for today. Rest and recover or pick a routine manually."
            />
          )}
        </Section>

        {pendingWeight ? (
          <WeightBannerSkeleton />
        ) : errorWeight && todayWeight === undefined ? (
          <SectionLoadError
            title="Body weight couldn’t load"
            error={errorWeight}
            retrying={fetchingWeight}
            onRetry={() => void refetchWeight()}
          />
        ) : (
          !todayWeight && (
            <View className="flex-row items-center gap-md border-y border-border py-md">
              <View className="flex-1 gap-xs">
                <Text className="font-body-semibold text-body text-text-primary">
                  Track body weight
                </Text>
                <Text className="font-body text-caption leading-5 text-text-secondary">
                  Keep your progress context up to date.
                </Text>
              </View>
              <IconButton
                variant="bare"
                icon="plus"
                iconSize={16}
                label="Log body weight"
                onPress={() => setShowBodyWeightModal(true)}
              />
            </View>
          )
        )}

        {pendingSessions ? (
          <ConsistencySkeleton />
        ) : sessions ? (
          <ConsistencyGrid sessions={sessions} mode="recent" framed={false} />
        ) : null}

        <Section title="Last session">
          {pendingSessions ? (
            <LastSessionSkeleton />
          ) : errorSessions && !sessions ? (
            <SectionLoadError
              title="Workout sessions couldn’t load"
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
          label="Edit your schedule"
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
            <Button
              variant="primary"
              label={
                activeSession
                  ? `Resume ${activeSession.routineName}${
                      activeSession.isPaused ? " (Paused)" : ""
                    }`
                  : ongoingSession?.routine_id
                    ? `Resume ${ongoingRoutineName ?? "workout"}`
                    : todaySchedule
                      ? "Start workout"
                      : "Choose a workout"
              }
              onPress={handleStartWorkout}
            />
          </View>
        )
      )}

      <WeightLogModal
        visible={showBodyWeightModal}
        existingLog={todayWeight}
        onClose={() => setShowBodyWeightModal(false)}
      />

      <StartWorkoutPickerModal
        visible={showWorkoutPicker}
        onClose={() => setShowWorkoutPicker(false)}
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
