import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { styled } from "nativewind";

import { RoutineCard } from "./RoutineCard";
import { useRoutines } from "../../utils/routineStore";
import { ScreenHeader } from "../ui/ScreenHeader";

const StyledFontAwesome6 = styled(FontAwesome6, {
  className: { target: "style" },
});

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
          <Pressable
            accessibilityLabel="Create a new routine"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center rounded-full bg-accent active:bg-accent-pressed"
            onPress={() => openRoutine("new")}
          >
            <StyledFontAwesome6
              name="plus"
              iconStyle="solid"
              className="text-on-accent"
              size={24}
            />
          </Pressable>
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
          <View className="gap-sm">
            <View className="flex-row items-center justify-between">
              <Text className="font-body-semibold text-body text-text-primary">
                All routines
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                {routines.length} saved
              </Text>
            </View>
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onPress={() => openRoutine(routine.id)}
              />
            ))}
          </View>
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
