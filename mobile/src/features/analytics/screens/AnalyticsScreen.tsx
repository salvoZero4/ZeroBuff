import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Choices } from "../components/AnalyticsControls";
import { SessionHistory } from "../components/SessionHistory";
import { LoggedExerciseList } from "../components/LoggedExerciseList";
import { BodyWeightHistory } from "../components/BodyWeightHistory";
import { useQueuedWorkouts } from "@/features/workout/sync/WorkoutSyncProvider";

const TABS = ["Sessions", "Exercises", "Body weight"] as const;
export function AnalyticsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Sessions");
  const queue = useQueuedWorkouts();
  return (
    <View className="flex-1 bg-bg px-lg pt-lg">
      <View className="gap-lg pb-lg">
        <ScreenHeader
          title={t("Analytics")}
          subtitle={t("A closer look at your progress")}
        />
        <Choices values={TABS} value={tab} onChange={setTab} />
      </View>
      {tab === "Sessions" ? (
        <>
          {queue.data?.length ? (
            <ScrollView className="mb-md max-h-40" contentContainerClassName="gap-sm">
              {queue.data.map(({ payload, summary, routine, error }) => {
                const missing = error?.startsWith("Exercises not found:")
                  ? routine.exercises.filter((exercise) => error.includes(exercise.exercise_id)).map((exercise) => exercise.name)
                  : [];
                return (
                  <Pressable
                    key={payload.id}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: "/session/[sessionId]", params: { sessionId: payload.id } })}
                    className="gap-xs rounded-md border border-border bg-surface p-md"
                  >
                    <Text className="font-body-semibold text-body text-text-primary">{summary.routineName}</Text>
                    <Text className="font-body text-caption text-text-secondary">
                      {error ? t("Workout needs attention.") : t("Saved on this device")}
                    </Text>
                    {error && (
                      <Text className="font-body text-caption text-text-secondary">
                        {missing.length ? t("Exercises unavailable: {{exercises}}", { exercises: missing.join(", ") }) : error}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <SessionHistory />
        </>
      ) : tab === "Exercises" ? (
        <LoggedExerciseList
          onSelect={(exercise) =>
            router.push({
              pathname: "/analytics/exercise",
              params: { exerciseId: exercise.id, name: exercise.name },
            })
          }
        />
      ) : (
        <BodyWeightHistory />
      )}
    </View>
  );
}
