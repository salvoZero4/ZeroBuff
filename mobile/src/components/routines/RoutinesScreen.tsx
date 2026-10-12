import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { RoutineCard } from "./RoutineCard";
import { useRoutines } from "../../utils/stores/routineStore";
import { ScreenHeader } from "../ui/ScreenHeader";
import { Section } from "../ui/Section";
import { IconButton } from "../ui/IconButton";

function openRoutine(routineId: string) {
  router.push({
    pathname: "/(tabs)/routines/[routineId]",
    params: { routineId },
  });
}

export function RoutinesScreen() {
  const routines = useRoutines();

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-end justify-between gap-md">
          <ScreenHeader title="Your routines" subtitle="Plan your workouts" />
          <IconButton
            variant="accent"
            icon="plus"
            iconSize={24}
            label="Create a new routine"
            onPress={() => openRoutine("new")}
          />
        </View>

        <View className="flex-row gap-sm">
          <View className="flex-1 gap-xs rounded-sm border border-border bg-surface p-md">
            <Text className="font-numeric-bold text-title text-accent">
              {routines.length}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {routines.length === 1 ? "routine" : "routines"}
            </Text>
          </View>
          <View className="flex-1 gap-xs rounded-sm border border-border bg-surface p-md">
            <Text className="font-numeric-bold text-title text-text-primary">
              {routines.reduce(
                (total, routine) => total + routine.exercises.length,
                0,
              )}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              movements
            </Text>
          </View>
        </View>

        {routines.length > 0 ? (
          <Section title="All routines">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                name={routine.name}
                muscleGroups={routine.muscleGroups}
                exerciseCount={routine.exercises.length}
                onPress={() => openRoutine(routine.id)}
              />
            ))}
          </Section>
        ) : (
          <View className="gap-md rounded-md border border-border bg-surface p-xl">
            <View className="items-center gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                No routines yet
              </Text>
              <Text className="text-center font-body text-caption leading-5 text-text-secondary">
                Create a routine to keep your next workout ready.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
