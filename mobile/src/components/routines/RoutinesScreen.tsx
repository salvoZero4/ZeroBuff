import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { styled } from "nativewind";

import { RoutineCard } from "./RoutineCard";
import { useRoutines } from "./routineStore";

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
        contentContainerClassName="gap-lg p-md pb-xl"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between gap-md">
          <View className="flex-1 gap-xs">
            <Text className="font-body-bold text-xl text-text-primary">
              Routine library
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              Build reusable workouts for any training day.
            </Text>
          </View>
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

        {routines.length > 0 ? (
          <View className="gap-sm">
            <Text className="font-body-semibold text-body text-text-primary">
              Your routines
            </Text>
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onPress={() => openRoutine(routine.id)}
              />
            ))}
          </View>
        ) : (
          <View className="items-center gap-md rounded-md border border-border bg-surface p-xl">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-raised">
              <StyledFontAwesome6
                name="dumbbell"
                iconStyle="solid"
                className="text-accent"
                size={22}
              />
            </View>
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
