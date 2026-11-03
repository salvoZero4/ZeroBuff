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
import { LoadingNotice, ScreenError } from "@/components/ui/ScreenState";
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

const TRAINING_MOTIVATIONS = [
  "Time to put in the work. Let's get it.",
  "Lock in. Every single rep counts today.",
  "No excuses. Push your limits now.",
  "Bring the focus. Leave nothing in the tank.",
  "Time to build. Execute with intent.",
  "Show up, put the work in, and conquer.",
] as const;

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
    error: errorTodaySchedule,
    refetch: refetchTodaySchedule,
  } = useQuery({
    queryKey: scheduleKeys.today(),
    queryFn: getTodaySchedule,
  });

  const {
    data: sessions = [],
    isPending: pendingSessions,
    error: errorSessions,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: sessionKeys.list({ limit: 64 }),
    queryFn: () => getSessions({ limit: 64 }),
  });

  // Session still open on the server (e.g. the app was closed mid-workout)
  const ongoingSession = useMemo(
    () => sessions.find((s) => s.status !== "completed"),
    [sessions],
  );

  const {
    data: routines = [],
    isPending: pendingRoutines,
    error: errorRoutines,
    refetch: refetchRoutines,
  } = useQuery({
    queryKey: routineKeys.list(),
    queryFn: () => getRoutines(),
  });

  const {
    data: todayWeight,
    isPending: pendingWeight,
    error: errorWeight,
    refetch: refetchWeight,
  } = useQuery<WeightLogRead | null>({
    queryKey: weightKeys.today(todayDateStr),
    queryFn: () => getTodayWeight(todayDateStr),
  });

  const {
    data: weekSchedule = [],
    isPending: pendingWeekSchedule,
    error: errorWeekSchedule,
    refetch: refetchWeekSchedule,
  } = useQuery({
    queryKey: scheduleKeys.list(),
    queryFn: getSchedule,
  });

  const hasCompletedSessionToday = useMemo(() => {
    return sessions.some(
      (s) => s.status === "completed" && s.date === todayDateStr,
    );
  }, [sessions, todayDateStr]);

  const showStartWorkoutBotton =
    !hasCompletedSessionToday ||
    Boolean(activeSession) ||
    Boolean(ongoingSession);

  const motivationalDescription = useMemo(() => {
    const seed = [...todayDateStr].reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    );
    return TRAINING_MOTIVATIONS[seed % TRAINING_MOTIVATIONS.length];
  }, [todayDateStr]);

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

  const scheduledDayKeys = new Set(weekSchedule.map((s) => s.day_of_week));

  const lastCompletedSession = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed");
    if (completed.length === 0) return undefined;
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

    if (todaySchedule) {
      router.push({
        pathname: "/workout/[routineId]",
        params: { routineId: todaySchedule.routine_id },
      });
    } else {
      setShowWorkoutPicker(true);
    }
  }

  const loadError =
    errorTodaySchedule ||
    errorSessions ||
    errorRoutines ||
    errorWeight ||
    errorWeekSchedule;
  if (loadError)
    return (
      <ScreenError
        title="Today couldn’t load"
        message={loadErrorMessage(loadError)}
        onRetry={handleRefetch}
        busy={isRefetching}
      />
    );

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
            pendingSessions ||
            pendingRoutines
          }
        />

        {pendingWeekSchedule ? (
          <WeekStripSkeleton />
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
          ) : todaySchedule ? (
            <InfoCard
              title={todaySchedule.routine_name}
              description={motivationalDescription}
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
        ) : (
          !todayWeight && (
            <View className="flex-row items-center gap-md rounded-md border border-accent/30 bg-surface-raised p-lg">
              <View className="flex-1 gap-xs">
                <Text className="font-body-semibold text-body text-text-primary">
                  Track body weight
                </Text>
                <Text className="font-body text-caption leading-5 text-text-secondary">
                  Keep your progress context up to date.
                </Text>
              </View>
              <IconButton
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
        ) : (
          <ConsistencyGrid sessions={sessions} mode="recent" />
        )}

        <Section title="Last session">
          {pendingSessions || pendingRoutines ? (
            <LastSessionSkeleton />
          ) : (
            <LastSessionCard
              session={lastCompletedSession}
              routineName={lastSessionRoutineName}
            />
          )}
        </Section>

        <Button
          variant="outline"
          icon="pen-to-square"
          label="Edit your schedule"
          onPress={() => router.push("/schedule")}
        />
        {(pendingSessions ||
          pendingRoutines ||
          pendingTodaySchedule ||
          showStartWorkoutBotton) && (
          <View className="mb-md" style={{ height: startButtonHeight }} />
        )}
      </ScrollView>
      {pendingSessions || pendingRoutines || pendingTodaySchedule ? (
        <View
          className="absolute bottom-md left-lg right-lg"
          onLayout={(event) =>
            setStartButtonHeight(event.nativeEvent.layout.height)
          }
        >
          <Skeleton className="h-14 w-full rounded-md" />
        </View>
      ) : (
        showStartWorkoutBotton && (
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
                  : ongoingSession
                    ? `Resume ${ongoingRoutineName ?? "workout"}`
                    : todaySchedule
                      ? `Start`
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
