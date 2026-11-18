import { numberLabel } from "@/shared/i18n/i18n";
import { useExerciseNames } from "@/features/exercises/api/useExerciseNames";
import { useTranslation } from "react-i18next";
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

export function WorkoutSummaryScreen({
  summary,
  onDone,
  onViewWorkout,
}: {
  summary: WorkoutSummary;
  onDone: () => void;
  onViewWorkout: () => void;
}) {
  const { t } = useTranslation();
  const exerciseName = useExerciseNames();
  const insets = useSafeAreaInsets();
  const empty = summary.sets === 0;
  const minutes = Math.floor(summary.durationSeconds / 60);
  const seconds = summary.durationSeconds % 60;
  const stats = empty
    ? [[t("Duration"), `${minutes}m ${seconds}s`]]
    : [
        [t("Completed sets"), String(summary.sets)],
        [t("Duration"), `${minutes}m ${seconds}s`],
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
              {empty
                ? t("Workout ended · No sets recorded")
                : t("Workout saved")}
            </Text>
          </View>
        </Animated.View>
        <View className="flex-row flex-wrap gap-lg">
          {stats.map(([label, value]) => (
            <View key={label} className="min-w-32 flex-1 gap-xs">
              <Text className="font-numeric-bold text-[36px] text-text-primary">
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
              [t("Exercises"), summary.exercises],
              [t("Total reps"), summary.reps],
              ...(summary.hasAddedLoad
                ? [
                    [
                      t("Load volume"),
                      `${numberLabel(summary.volume)} ${WEIGHT_UNIT}`,
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
                ? t(
                    "Load volume is added weight × reps. Bodyweight is not included.",
                  )
                : t("Bodyweight sets are tracked by reps, with no added load.")}
            </Text>
          </View>
        ) : null}
        {!empty ? (
          <View className="gap-md">
            <Text
              accessibilityRole="header"
              className="font-body-semibold text-xl text-text-primary"
            >
              {t("Compared with last time")}
            </Text>
            {summary.improvements.map((improvement) => (
              <View
                key={improvement.exerciseId}
                className="gap-xs border-b border-border pb-md"
              >
                <Text className="font-body-semibold text-body text-text-primary">
                  {exerciseName(improvement.exerciseId, improvement.name)}
                </Text>
                <Text className="font-body text-caption text-text-secondary">
                  {improvement.metric === "reps"
                    ? t("Best set reps")
                    : t("Best set load volume")}
                </Text>
                <Text className="font-numeric text-[24px] text-accent">
                  {numberLabel(improvement.previous)} →{" "}
                  {numberLabel(improvement.current)}{" "}
                  {improvement.metric === "reps" ? t("reps") : WEIGHT_UNIT}
                </Text>
              </View>
            ))}
            <Text className="font-body text-caption text-text-secondary">
              {summary.comparedExercises === 0
                ? t(
                    "No previous performance available to compare for this workout.",
                  )
                : t(
                    "{{noIncreases}}Compared {{compared}} of {{total}} exercises using available previous sessions.{{partial}}",
                    {
                      noIncreases:
                        summary.improvements.length === 0
                          ? t(
                              "No best-set increases in the available comparisons. ",
                            )
                          : "",
                      compared: summary.comparedExercises,
                      total: summary.exercises,
                      partial:
                        summary.comparedExercises < summary.exercises
                          ? t(" Comparison is partial.")
                          : "",
                    },
                  )}
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
            label={t("View workout")}
            variant="outline"
            onPress={onViewWorkout}
          />
        ) : null}
        <Button label={t("Back to Today")} onPress={onDone} />
      </View>
    </View>
  );
}
