import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { useQuery } from "@tanstack/react-query";
import { ConsistencyGrid } from "../shared/ConsistencyGrid";
import { ScreenHeader } from "../ui/ScreenHeader";
import { Section } from "../ui/Section";
import { InfoCard } from "./InfoCard";
import { LastSessionCard } from "./LastSessionCard";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { WeekStrip } from "./WeekStrip";
import { WeightLogModal } from "../shared/WeightLogModal";
import { useActiveWorkout } from "@/utils/stores/activeWorkoutStore";
import {
  getSchedule,
  getTodaySchedule,
  type DayOfWeek,
} from "@/utils/api/schedule";
import { getTodayWeight, type WeightLogRead } from "@/utils/api/weight";
import { getSessions } from "@/utils/api/session";
import { getRoutines } from "@/utils/api/routines";
import { StartWorkoutPickerModal } from "./StartWorkoutPickerModal";

const DAY_KEYS: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function TodayScreen() {
  const [isRefetching, setIsRefetching] = useState(false);
  const [showBodyWeightModal, setShowBodyWeightModal] = useState(false);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);

  const TRAINING_MOTIVATIONS = [
    "Time to put in the work. Let's get it.",
    "Lock in. Every single rep counts today.",
    "No excuses. Push your limits now.",
    "Bring the focus. Leave nothing in the tank.",
    "Time to build. Execute with intent.",
    "Show up, put the work in, and conquer.",
  ];
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const activeSession = useActiveWorkout();

  const { data: todaySchedule, refetch: refetchTodaySchedule } = useQuery({
    queryKey: ["schedule", "today"],
    queryFn: getTodaySchedule,
  });

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => getSessions({ limit: 64 }),
  });

  const { data: routines = [], refetch: refetchRoutines } = useQuery({
    queryKey: ["routines"],
    queryFn: () => getRoutines(),
  });

  const { data: todayWeight, refetch: refetchWeight } =
    useQuery<WeightLogRead | null>({
      queryKey: ["bodyWeight", "today"],
      queryFn: () => getTodayWeight(),
    });

  const { data: weekSchedule = [], refetch: refetchWeekSchedule } = useQuery({
    queryKey: ["schedule"],
    queryFn: getSchedule,
  });

  const motivationalDescription = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * TRAINING_MOTIVATIONS.length);
    return TRAINING_MOTIVATIONS[randomIndex];
  }, [todaySchedule]);

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
      router.push(`/workout/${activeSession.routineId}` as any);
      return;
    }

    if (todaySchedule) {
      router.push(`/workout/${todaySchedule.routine_id}` as any);
    } else {
      setShowWorkoutPicker(true);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-31"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefetch}
            tintColor="#f5f5f5"
          />
        }
      >
        <ScreenHeader title="This week" subtitle={today} />

        <WeekStrip
          hasRoutine={(_date, dayIndex) => {
            const dayKey = DAY_KEYS[dayIndex];
            return scheduledDayKeys.has(dayKey);
          }}
        />

        <Section title="Today's routine">
          {todaySchedule ? (
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

        {!todayWeight && (
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
        )}

        <ConsistencyGrid sessions={sessions} mode="recent" />

        <Section title="Last session">
          <LastSessionCard
            session={lastCompletedSession}
            routineName={lastSessionRoutineName}
          />
        </Section>

        <Button
          variant="outline"
          icon="pen-to-square"
          label="Edit your schedule"
          onPress={() => router.push("/schedule")}
        />
      </ScrollView>

      <View className="absolute bottom-md left-lg right-lg">
        <Button
          variant="primary"
          label={
            activeSession
              ? `Resume ${activeSession.routineName}${
                  activeSession.isPaused ? " (Paused)" : ""
                }`
              : todaySchedule
                ? `Start`
                : "Choose a workout"
          }
          onPress={handleStartWorkout}
        />
      </View>

      <WeightLogModal
        visible={showBodyWeightModal}
        existingLog={todayWeight}
        onClose={() => setShowBodyWeightModal(false)}
      />

      <StartWorkoutPickerModal
        visible={showWorkoutPicker}
        onClose={() => setShowWorkoutPicker(false)}
        onSelectRoutine={(routineId) => {
          router.push(`/workout/${routineId}` as any);
        }}
      />
    </View>
  );
}
