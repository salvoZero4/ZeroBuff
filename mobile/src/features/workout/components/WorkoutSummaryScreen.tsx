import { ScrollView, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { WorkoutSummary } from "@/features/workout/utils/experience";
import { WEIGHT_UNIT } from "@/features/workout/utils/experience";

export function WorkoutSummaryScreen({
  summary,
  onDone,
}: {
  summary: WorkoutSummary;
  onDone: () => void;
}) {
  const minutes = Math.floor(summary.durationSeconds / 60);
  const seconds = summary.durationSeconds % 60;
  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-lg p-lg pb-xl">
        <Text className="font-body-bold text-title text-text-primary">
          Workout saved
        </Text>
        <Text className="font-body text-body text-text-secondary">
          {summary.routineName}
        </Text>
        <Card className="gap-md">
          {[
            ["Duration", `${minutes}m ${seconds}s`],
            ["Exercises", summary.exercises],
            ["Completed sets", summary.sets],
            [
              "Total volume",
              `${summary.volume.toLocaleString()} ${WEIGHT_UNIT}`,
            ],
          ].map(([label, value]) => (
            <View
              key={label}
              className="flex-row items-center justify-between gap-md"
            >
              <Text className="font-body text-body text-text-secondary">
                {label}
              </Text>
              <Text className="font-numeric-bold text-xl text-text-primary">
                {value}
              </Text>
            </View>
          ))}
        </Card>
        {summary.comparedExercises > 0 ? (
          <Card className="gap-xs">
            <Text className="font-body-semibold text-body text-text-primary">
              Previous performance
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {summary.improvedExercises} of {summary.comparedExercises}{" "}
              compared exercises improved their best set volume, or reps at zero
              added weight. Comparisons use the previous sessions loaded during
              this workout.
            </Text>
          </Card>
        ) : null}
      </ScrollView>
      <View className="p-lg">
        <Button label="Back to Today" onPress={onDone} />
      </View>
    </View>
  );
}
