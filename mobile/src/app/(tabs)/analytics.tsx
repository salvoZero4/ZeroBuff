import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
type AnalyticsView = "progress" | "history";

// PROVISIONAL: this screen uses local empty states until analytics endpoints
// provide routine statistics and session history.
export default function AnalyticsScreen() {
  const [view, setView] = useState<AnalyticsView>("progress");

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="See your progress"
          subtitle="Progress is built one session at a time"
        />
        <View className="flex justify-center border items-center rounded-sm bg-surface h-20">
          <Text className="text-accent font-body-bold text-2xl">
            Work in progress!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
