import { routineKeys } from "@/features/routines/api/queryKeys";
import { scheduleKeys } from "@/features/schedule/api/queryKeys";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScreenError } from "@/components/ui/ScreenState";
import { loadErrorMessage } from "@/shared/api/loadError";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { getRoutines } from "@/features/routines/api/routines";
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  updateSchedule,
} from "@/features/schedule/api/schedule";
import type {
  DayOfWeek,
  ScheduleRead,
} from "@/features/schedule/types/schedule";
import { ScheduleDayRow } from "@/features/schedule/components/ScheduleDayRow";
import { RoutineSelectorModal } from "@/features/schedule/components/RoutineSelectorModal";

export const DAYS: readonly { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export function ScheduleScreen() {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<DayOfWeek | null>(null);

  const {
    data: routines = [],
    isLoading: isRoutinesLoading,
    error: routinesError,
    refetch: refetchRoutines,
    isRefetching: refreshingRoutines,
  } = useQuery({
    queryKey: routineKeys.list(),
    queryFn: () => getRoutines(),
  });

  const {
    data: schedule = [],
    isLoading: isScheduleLoading,
    error: scheduleError,
    refetch: refetchSchedule,
    isRefetching: refreshingSchedule,
  } = useQuery({
    queryKey: scheduleKeys.list(),
    queryFn: getSchedule,
  });

  const scheduleByDay = schedule.reduce<
    Record<DayOfWeek, ScheduleRead | undefined>
  >(
    (acc, item) => {
      acc[item.day_of_week] = item;
      return acc;
    },
    {} as Record<DayOfWeek, ScheduleRead | undefined>,
  );

  const { mutate: handleAssignRoutine, isPending: isAssigning } = useMutation({
    mutationFn: async ({
      dayKey,
      newRoutineId,
    }: {
      dayKey: DayOfWeek;
      newRoutineId: string | null;
    }) => {
      const existing = scheduleByDay[dayKey];

      if (newRoutineId === null) {
        if (existing) {
          await deleteSchedule(existing.id);
        }
      } else if (existing) {
        if (existing.routine_id !== newRoutineId) {
          await updateSchedule(existing.id, { routine_id: newRoutineId });
        }
      } else {
        await createSchedule({ day_of_week: dayKey, routine_id: newRoutineId });
      }
    },
    onMutate: () => setSaveError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      setSelectedDayKey(null);
    },
    onError: () => {
      setSaveError(
        "Could not save this change. Select the routine again to retry.",
      );
    },
  });

  const selectedDay = DAYS.find((day) => day.key === selectedDayKey);
  const currentAssignment = selectedDayKey
    ? scheduleByDay[selectedDayKey]
    : undefined;

  const isLoading = isRoutinesLoading || isScheduleLoading;

  if (routinesError || scheduleError)
    return (
      <ScreenError
        title="Schedule couldn’t load"
        message={loadErrorMessage(routinesError || scheduleError)}
        busy={refreshingRoutines || refreshingSchedule}
        onRetry={() => {
          void refetchRoutines();
          void refetchSchedule();
        }}
        onBack={() => router.back()}
      />
    );

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-md">
          <IconButton
            variant="bare"
            disabled={isAssigning}
            label="Go Back"
            icon="arrow-left"
            iconSize={20}
            onPress={() => router.back()}
          />
          <View className="flex-1">
            <ScreenHeader
              title="Schedule"
              subtitle="Plan your week · Changes save automatically"
            />
          </View>
        </View>

        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator color="#f5f5f5" />
          </View>
        ) : (
          <View>
            {DAYS.map((day, index) => {
              const item = scheduleByDay[day.key];
              return (
                <ScheduleDayRow
                  key={day.key}
                  dayLabel={day.label}
                  assignment={item ? item.routine_name : null}
                  isLast={index === DAYS.length - 1}
                  disabled={routines.length === 0 || isAssigning}
                  onPress={() => {
                    setSaveError(null);
                    setSelectedDayKey(day.key);
                  }}
                />
              );
            })}
          </View>
        )}

        {routines.length === 0 && !isLoading && (
          <View className="gap-md py-lg">
            <Text className="font-body text-caption text-text-secondary">
              You haven&apos;t created any routines yet. Create a routine first
              to assign it to your week.
            </Text>
            <Button
              label="Create routine"
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/routines/[routineId]",
                  params: { routineId: "new" },
                })
              }
            />
          </View>
        )}
      </ScrollView>

      <RoutineSelectorModal
        visible={selectedDayKey !== null}
        dayLabel={selectedDay?.label}
        isPending={isAssigning}
        error={saveError}
        routines={routines}
        selectedRoutineId={
          currentAssignment ? currentAssignment.routine_id : null
        }
        onSelect={(newRoutineId) => {
          if (selectedDayKey && !isAssigning) {
            handleAssignRoutine({ dayKey: selectedDayKey, newRoutineId });
          }
        }}
        onClose={() => {
          if (!isAssigning) setSelectedDayKey(null);
        }}
      />
    </View>
  );
}
