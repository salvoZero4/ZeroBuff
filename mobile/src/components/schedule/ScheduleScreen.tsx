import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { getRoutines } from "@/utils/api/routines";
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  updateSchedule,
  type DayOfWeek,
  type ScheduleRead,
} from "@/utils/api/schedule";
import { ScheduleDayRow } from "./ScheduleDayRow";
import { RoutineSelectorModal } from "./RoutineSelectorModal";

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
  const [selectedDayKey, setSelectedDayKey] = useState<DayOfWeek | null>(null);

  // 1. Fetch delle routine create dall'utente
  const { data: routines = [], isLoading: isRoutinesLoading } = useQuery({
    queryKey: ["routines"],
    queryFn: () => getRoutines(),
  });

  // 2. Fetch della pianificazione settimanale corrente
  const { data: schedule = [], isLoading: isScheduleLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: getSchedule,
  });

  // Mappa veloce per cercare la riga di pianificazione per giorno
  const scheduleByDay = schedule.reduce<
    Record<DayOfWeek, ScheduleRead | undefined>
  >(
    (acc, item) => {
      acc[item.day_of_week] = item;
      return acc;
    },
    {} as Record<DayOfWeek, ScheduleRead | undefined>,
  );

  // 3. Mutation per cambiare l'assegnazione di un giorno
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
        // Assegnato "Rest": se esisteva una riga la eliminiamo
        if (existing) {
          await deleteSchedule(existing.id);
        }
      } else if (existing) {
        // Cambio routine su un giorno già pianificato
        if (existing.routine_id !== newRoutineId) {
          await updateSchedule(existing.id, { routine_id: newRoutineId });
        }
      } else {
        // Nuova pianificazione su giorno vuoto
        await createSchedule({ day_of_week: dayKey, routine_id: newRoutineId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["schedule", "today"] });
      setSelectedDayKey(null);
    },
    onError: () => {
      Alert.alert("Error", "Could not update the schedule. Try again.");
    },
  });

  const selectedDay = DAYS.find((day) => day.key === selectedDayKey);
  const currentAssignment = selectedDayKey
    ? scheduleByDay[selectedDayKey]
    : undefined;

  const isLoading = isRoutinesLoading || isScheduleLoading;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-32"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-md">
          <IconButton
            label="Go Back"
            icon="arrow-left"
            iconSize={20}
            onPress={() => router.back()}
          />
          <ScreenHeader
            title="Plan your week"
            subtitle="Assign one routine to each training day"
          />
        </View>

        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator color="#E2F163" />
          </View>
        ) : (
          <View className="overflow-hidden rounded-md border border-border bg-surface">
            {DAYS.map((day, index) => {
              const item = scheduleByDay[day.key];
              return (
                <ScheduleDayRow
                  key={day.key}
                  dayLabel={day.label}
                  assignment={item ? item.routine_name : null}
                  isLast={index === DAYS.length - 1}
                  disabled={routines.length === 0 || isAssigning}
                  onPress={() => setSelectedDayKey(day.key)}
                />
              );
            })}
          </View>
        )}

        {routines.length === 0 && !isLoading && (
          <View className="rounded-md border border-border bg-surface p-lg">
            <Text className="text-center font-body text-caption text-text-secondary">
              You haven't created any routines yet. Create a routine first to
              assign it to your week.
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-16 left-lg right-lg">
        <Button label="Done" variant="primary" onPress={() => router.back()} />
      </View>

      <RoutineSelectorModal
        visible={selectedDayKey !== null}
        dayLabel={selectedDay?.label}
        routines={routines}
        selectedRoutineId={
          currentAssignment ? currentAssignment.routine_id : null
        }
        onSelect={(newRoutineId) => {
          if (selectedDayKey) {
            handleAssignRoutine({ dayKey: selectedDayKey, newRoutineId });
          }
        }}
        onClose={() => setSelectedDayKey(null)}
      />
    </View>
  );
}
