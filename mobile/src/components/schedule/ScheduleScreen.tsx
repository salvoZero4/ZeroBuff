import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { useRoutines } from "@/utils/stores/routineStore";
import { ScheduleDayRow } from "./ScheduleDayRow";
import { RoutineSelectorModal } from "./RoutineSelectorModal";

export const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

export function ScheduleScreen() {
  const routines = useRoutines();
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    () => Object.fromEntries(DAYS.map((day) => [day.key, null])),
  );
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  function setAssignment(dayKey: string, routineName: string | null) {
    setAssignments((current) => ({
      ...current,
      [dayKey]: routineName,
    }));
    setSelectedDayKey(null);
  }

  const selectedDay = DAYS.find((day) => day.key === selectedDayKey);

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

        <View className="overflow-hidden rounded-md border border-border bg-surface">
          {DAYS.map((day, index) => (
            <ScheduleDayRow
              key={day.key}
              dayLabel={day.label}
              assignment={assignments[day.key]}
              isLast={index === DAYS.length - 1}
              disabled={routines.length === 0}
              onPress={() => setSelectedDayKey(day.key)}
            />
          ))}
        </View>
      </ScrollView>

      <View className="absolute bottom-16 left-lg right-lg">
        <Button label="Done" variant="primary" onPress={() => router.back()} />
      </View>

      <RoutineSelectorModal
        visible={selectedDayKey !== null}
        dayLabel={selectedDay?.label}
        routines={routines}
        selectedRoutineName={
          selectedDayKey ? assignments[selectedDayKey] : null
        }
        onSelect={(routineName) => {
          if (selectedDayKey) {
            setAssignment(selectedDayKey, routineName);
          }
        }}
        onClose={() => setSelectedDayKey(null)}
      />
    </View>
  );
}
