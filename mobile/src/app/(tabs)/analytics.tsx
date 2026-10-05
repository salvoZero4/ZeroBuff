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

        <View
          accessibilityRole="tablist"
          className="flex-row rounded-sm border border-border bg-surface p-xs"
        >
          {[
            { key: "progress" as const, label: "Progress" },
            { key: "history" as const, label: "Session history" },
          ].map((item) => {
            const selected = view === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityLabel={item.label}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                className={`min-h-12 flex-1 items-center justify-center rounded-sm ${
                  selected ? "bg-accent" : ""
                }`}
                onPress={() => setView(item.key)}
              >
                <Text
                  className={`font-body-semibold text-caption ${
                    selected ? "text-on-accent" : "text-text-secondary"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {view === "progress" ? (
          <>
            <View className="flex-row gap-sm">
              <MetricCard label="Sessions" value="0" />
              <MetricCard label="This month" value="—" />
            </View>
            <View className="gap-md rounded-md border border-border bg-surface p-lg">
              <Text className="font-body-semibold text-body text-text-primary">
                Routine progress
              </Text>
              <EmptyAnalytics
                title="No progress to chart yet"
                description="Complete a session to start seeing movement trends here."
              />
            </View>
          </>
        ) : (
          <View className="gap-md rounded-md border border-border bg-surface p-lg">
            <Text className="font-body-semibold text-body text-text-primary">
              Session history
            </Text>
            <EmptyAnalytics
              title="No sessions yet"
              description="Your completed workouts will be collected here."
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-xs rounded-sm border border-border bg-surface p-lg">
      <Text className="font-numeric-bold text-title text-accent">{value}</Text>
      <Text className="font-body text-caption text-text-secondary">
        {label}
      </Text>
    </View>
  );
}

function EmptyAnalytics({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="items-center gap-sm py-lg">
      <Text className="font-body-bold text-body text-text-primary">
        {title}
      </Text>
      <Text className="text-center font-body text-caption leading-5 text-text-secondary">
        {description}
      </Text>
    </View>
  );
}
