import { sessionKeys } from "@/features/workout/api/queryKeys";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { ScreenError, ScreenSkeleton } from "@/components/ui/ScreenState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSessionDetails } from "@/features/workout/api/session";
import { loadErrorMessage } from "@/shared/api/loadError";

export function WorkoutDetailScreen({ sessionId }: { sessionId: string }) {
  const insets = useSafeAreaInsets();
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => getSessionDetails(sessionId),
    enabled: !!sessionId,
  });
  const onDone = () => router.replace("/(tabs)");
  if (error || !sessionId)
    return (
      <ScreenError
        title="Workout couldn’t load"
        message={loadErrorMessage(error)}
        onRetry={() => {
          void refetch();
        }}
        busy={isFetching}
        onBack={onDone}
      />
    );
  if (isPending)
    return (
      <ScreenSkeleton label="Loading your workout…">
        <Skeleton className="h-10 w-48" />
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </ScreenSkeleton>
    );
  const exercises = [...new Set(data.sets.map((set) => set.exercise_id))];
  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-lg p-lg pb-xl">
        <View className="gap-sm">
          <Text
            accessibilityRole="header"
            className="font-body-bold text-title text-text-primary"
          >
            Workout details
          </Text>
          <Text className="font-body text-caption text-text-secondary">
            {new Date(data.started_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}{" "}
            · {data.sets.length} saved sets
          </Text>
        </View>
        {exercises.map((id) => {
          const sets = data.sets
            .filter((set) => set.exercise_id === id)
            .sort((a, b) => a.set_number - b.set_number);
          return (
            <View key={id} className="gap-md border-t border-border pt-lg">
              <Text
                accessibilityRole="header"
                className="font-body-semibold text-xl text-text-primary"
              >
                {sets[0].exercise_name}
              </Text>
              {sets.map((set) => (
                <View
                  key={set.id}
                  className="flex-row flex-wrap justify-between gap-sm"
                >
                  <Text className="font-body text-body text-text-secondary">
                    Set {set.set_number}
                  </Text>
                  <View className="gap-xs">
                    <Text className="font-numeric text-xl text-text-primary">
                      {set.weight === 0
                        ? `${set.reps} reps · Bodyweight`
                        : `${set.weight.toLocaleString()} kg × ${set.reps} reps`}
                    </Text>
                    {set.rir !== null ? (
                      <Text className="font-body text-caption text-text-secondary">
                        RIR {set.rir}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          );
        })}
        {data.sets.length === 0 ? (
          <Text className="font-body text-body text-text-secondary">
            No sets recorded in this workout.
          </Text>
        ) : null}
      </ScrollView>
      <View
        className="gap-sm px-lg pt-sm"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button label="Back to Today" onPress={onDone} />
      </View>
    </View>
  );
}
