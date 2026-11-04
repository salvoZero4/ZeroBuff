import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  ZoomIn,
} from "react-native-reanimated";
import { Icon } from "@/components/ui/Icon";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import type { WorkoutSummary } from "@/features/workout/utils/experience";
import { WEIGHT_UNIT } from "@/features/workout/utils/experience";

const summaryEntrance = FadeInDown.duration(280)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const savedEntrance = ZoomIn.duration(220)
  .withInitialValues({ transform: [{ scale: 0.6 }] })
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function WorkoutSummaryScreen({
  summary,
  onDone,
  onViewWorkout,
}: {
  summary: WorkoutSummary;
  onDone: () => void;
  onViewWorkout: () => void;
}) {
  const insets = useSafeAreaInsets();
  const empty = summary.sets === 0;
  const minutes = Math.floor(summary.durationSeconds / 60);
  const seconds = summary.durationSeconds % 60;
  const stats = empty
    ? [["Duration", `${minutes}m ${seconds}s`]]
    : [
        ["Completed sets", String(summary.sets)],
        ["Duration", `${minutes}m ${seconds}s`],
      ];

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-xl p-lg pb-xl">
        <Animated.View
          className="gap-sm"
          entering={empty ? undefined : summaryEntrance}
        >
          <Text
            accessibilityRole="header"
            className="font-body-bold text-title text-text-primary"
          >
            {summary.routineName}
          </Text>
          <View className="flex-row items-center gap-sm">
            {!empty ? (
              <Animated.View entering={savedEntrance}>
                <Icon name="check" size={16} className="text-accent" />
              </Animated.View>
            ) : null}
            <Text
              accessibilityLiveRegion="polite"
              className="font-body text-body text-text-secondary"
            >
              {empty ? "Workout ended · No sets recorded" : "Workout saved"}
            </Text>
          </View>
        </Animated.View>
        <View className="flex-row flex-wrap gap-lg">
          {stats.map(([label, value]) => (
            <View key={label} className="min-w-32 flex-1 gap-xs">
              <Text className="font-numeric-bold text-4xl text-text-primary">
                {value}
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                {label}
              </Text>
            </View>
          ))}
        </View>
        {!empty ? (
          <View className="gap-md border-t border-border pt-lg">
            {[
              ["Exercises", summary.exercises],
              ["Total reps", summary.reps],
              ...(summary.hasAddedLoad
                ? [
                    [
                      "Load volume",
                      `${formatNumber(summary.volume)} ${WEIGHT_UNIT}`,
                    ],
                  ]
                : []),
            ].map(([label, value]) => (
              <View
                key={label}
                className="flex-row flex-wrap justify-between gap-sm"
              >
                <Text className="font-body text-body text-text-secondary">
                  {label}
                </Text>
                <Text className="font-numeric text-xl text-text-primary">
                  {value}
                </Text>
              </View>
            ))}
            <Text className="font-body text-caption text-text-secondary">
              {summary.hasAddedLoad
                ? "Load volume is added weight × reps. Bodyweight is not included."
                : "Bodyweight sets are tracked by reps, with no added load."}
            </Text>
          </View>
        ) : null}
        {!empty ? (
          <View className="gap-md">
            <Text
              accessibilityRole="header"
              className="font-body-semibold text-xl text-text-primary"
            >
              Compared with last time
            </Text>
            {summary.improvements.map((improvement) => (
              <View
                key={improvement.exerciseId}
                className="gap-xs border-b border-border pb-md"
              >
                <Text className="font-body-semibold text-body text-text-primary">
                  {improvement.name}
                </Text>
                <Text className="font-body text-caption text-text-secondary">
                  {improvement.metric === "reps"
                    ? "Best set reps"
                    : "Best set load volume"}
                </Text>
                <Text className="font-numeric text-2xl text-accent">
                  {formatNumber(improvement.previous)} →{" "}
                  {formatNumber(improvement.current)}{" "}
                  {improvement.metric === "reps" ? "reps" : WEIGHT_UNIT}
                </Text>
              </View>
            ))}
            <Text className="font-body text-caption text-text-secondary">
              {summary.comparedExercises === 0
                ? "No previous performance available to compare for this workout."
                : `${summary.improvements.length === 0 ? "No best-set increases in the available comparisons. " : ""}Compared ${summary.comparedExercises} of ${summary.exercises} exercises using available previous sessions.${summary.comparedExercises < summary.exercises ? " Comparison is partial." : ""}`}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <View
        className="gap-sm px-lg pt-sm"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {summary.sessionId ? (
          <Button
            label="View workout"
            variant="outline"
            onPress={onViewWorkout}
          />
        ) : null}
        <Button label="Back to Today" onPress={onDone} />
      </View>
    </View>
  );
}
