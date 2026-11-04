import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Choices } from "../components/AnalyticsControls";
import { SessionHistory } from "../components/SessionHistory";
import { LoggedExerciseList } from "../components/LoggedExerciseList";
import { BodyWeightHistory } from "../components/BodyWeightHistory";
const TABS = ["Sessions", "Exercises", "Body weight"] as const;
export function AnalyticsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Sessions");
  return (
    <View className="flex-1 bg-bg px-lg pt-lg">
      <View className="gap-lg pb-lg">
        <ScreenHeader
          title="Analytics"
          subtitle="A closer look at your progress"
        />
        <Choices values={TABS} value={tab} onChange={setTab} />
      </View>
      {tab === "Sessions" ? (
        <SessionHistory />
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
