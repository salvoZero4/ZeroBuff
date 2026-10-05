import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
import { router } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { useRoutines } from "@/utils/routineStore";

const StyledFontAwesome6 = styled(FontAwesome6, {
  className: { target: "style" },
});

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

// PROVISIONAL: schedule assignments are local to this screen until the
// schedule API is connected. The row semantics match the backend contract.
export default function ScheduleRoute() {
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

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-md">
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center rounded-full bg-surface"
            onPress={() => router.back()}
          >
            <StyledFontAwesome6
              name="arrow-left"
              iconStyle="solid"
              className="text-text-primary"
              size={19}
            />
          </Pressable>
          <View className="flex-1 gap-xs">
            <Text className="font-body-bold text-title text-text-primary">
              Plan your week
            </Text>
          </View>
        </View>

        <View className="gap-xs">
          <Text className="font-body text-body leading-6 text-text-secondary">
            Assign one routine to each training day. Select a day to choose a
            routine or set it to rest.
          </Text>
          {routines.length === 0 ? (
            <Text className="font-body-semibold text-caption text-accent">
              Create a routine first to assign a training day.
            </Text>
          ) : null}
        </View>

        <View className="overflow-hidden rounded-md border border-border bg-surface">
          {DAYS.map((day, index) => {
            const assignment = assignments[day.key];
            const isTrainingDay = assignment !== null;

            return (
              <Pressable
                key={day.key}
                accessibilityLabel={`${day.label}: ${assignment ?? "Rest"}`}
                accessibilityRole="button"
                className={`gap-md px-lg py-lg active:bg-surface-raised ${
                  index < DAYS.length - 1 ? "border-b border-border" : ""
                }`}
                disabled={routines.length === 0}
                onPress={() => setSelectedDayKey(day.key)}
              >
                <View className="flex-row items-center justify-between gap-md">
                  <Text className="font-body-semibold text-body text-text-primary">
                    {day.label}
                  </Text>
                  <View className="flex-row items-center gap-md">
                    <View
                      className={`h-3 w-3 rounded-full ${
                        isTrainingDay ? "bg-accent" : "bg-surface-raised"
                      }`}
                    />
                    <Text
                      className={`font-body text-caption ${
                        isTrainingDay
                          ? "text-accent"
                          : "text-text-secondary"
                      }`}
                    >
                      {assignment ?? "Rest"}
                    </Text>
                    <StyledFontAwesome6
                      name="chevron-right"
                      iconStyle="solid"
                      className="text-text-secondary"
                      size={14}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="rounded-md border border-accent/30 bg-surface-raised p-lg">
          <Text className="font-body text-caption leading-5 text-text-secondary">
            Every day supports one routine. A rest day keeps your plan clear
            without removing any routine from your library.
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Finish editing schedule"
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-sm bg-accent active:bg-accent-pressed"
          onPress={() => router.back()}
        >
          <Text className="font-body-bold text-body text-on-accent">Done</Text>
        </Pressable>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedDayKey(null)}
        transparent
        visible={selectedDayKey !== null}
      >
        <View className="flex-1 justify-end bg-black/70">
          <Pressable
            accessibilityLabel="Close routine selector"
            accessibilityRole="button"
            className="absolute inset-0"
            onPress={() => setSelectedDayKey(null)}
          />
          <View className="gap-lg rounded-t-lg border border-border bg-surface p-lg">
            <View className="gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                {DAYS.find((day) => day.key === selectedDayKey)?.label}
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Choose a routine or make this a rest day.
              </Text>
            </View>
            <View className="gap-sm">
              {routines.map((routine) => {
                const selected = selectedDayKey
                  ? assignments[selectedDayKey] === routine.name
                  : false;
                return (
                  <Pressable
                    key={routine.id}
                    accessibilityLabel={`Set ${routine.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`min-h-14 flex-row items-center justify-between rounded-sm border px-lg ${
                      selected
                        ? "border-accent bg-accent"
                        : "border-border bg-surface-raised"
                    }`}
                    onPress={() => {
                      if (selectedDayKey) {
                        setAssignment(selectedDayKey, routine.name);
                      }
                    }}
                  >
                    <Text
                      className={`font-body-semibold text-body ${
                        selected ? "text-on-accent" : "text-text-primary"
                      }`}
                    >
                      {routine.name}
                    </Text>
                    {selected ? (
                      <StyledFontAwesome6
                        name="check"
                        iconStyle="solid"
                        className="text-on-accent"
                        size={16}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityLabel="Set rest day"
                accessibilityRole="button"
                accessibilityState={{
                  selected:
                    selectedDayKey !== null &&
                    assignments[selectedDayKey] === null,
                }}
                className={`min-h-14 flex-row items-center justify-between rounded-sm border px-lg ${
                  selectedDayKey !== null &&
                  assignments[selectedDayKey] === null
                    ? "border-accent bg-accent"
                    : "border-border bg-surface-raised"
                }`}
                onPress={() => {
                  if (selectedDayKey) {
                    setAssignment(selectedDayKey, null);
                  }
                }}
              >
                <Text
                  className={`font-body-semibold text-body ${
                    selectedDayKey !== null &&
                    assignments[selectedDayKey] === null
                      ? "text-on-accent"
                      : "text-text-primary"
                  }`}
                >
                  Rest
                </Text>
                {selectedDayKey !== null &&
                assignments[selectedDayKey] === null ? (
                  <StyledFontAwesome6
                    name="check"
                    iconStyle="solid"
                    className="text-on-accent"
                    size={16}
                  />
                ) : null}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
