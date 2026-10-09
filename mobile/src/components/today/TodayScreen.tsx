import { router } from "expo-router";
import { Icon } from "../ui/Icon";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ConsistencyGrid } from "../shared/ConsistencyGrid";
import { getWeekDays } from "@/utils/dates";
import { ScreenHeader } from "../ui/ScreenHeader";
import { Section } from "../ui/Section";
import { InfoCard } from "./InfoCard";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
export function TodayScreen() {
  const weekDays = getWeekDays();
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-31"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="This week" subtitle={today} />
        <View className="gap-sm">
          <View className="flex-row gap-xs rounded-md  ">
            {weekDays.map((day) => (
              <Pressable
                key={day.date}
                accessibilityLabel={`${day.label}, ${day.number}${day.isToday ? ", today" : ""}`}
                accessibilityRole="button"
                accessibilityState={{ selected: day.isToday }}
                className={`min-h-16 flex-1 items-center justify-center rounded-sm border ${
                  day.isToday
                    ? "border-accent bg-accent"
                    : "border-border bg-surface-raised"
                }`}
              >
                <Text
                  className={`font-body-bold text-caption ${
                    day.isToday ? "text-on-accent" : "text-text-secondary"
                  }`}
                >
                  {day.label}
                </Text>
                <Text
                  className={`font-numeric-bold text-xl ${
                    day.isToday ? "text-on-accent" : "text-text-primary"
                  }`}
                >
                  {day.number}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Section title="Today's routine">
          <InfoCard
            title="Rest day"
            description="No routine is scheduled for today."
          />
        </Section>

        <View className="flex-row items-center gap-md rounded-md border border-accent/30 bg-surface-raised p-lg">
          <View className="flex-1 gap-xs">
            <Text className="font-body-semibold text-body text-text-primary">
              Track body weight
            </Text>
            <Text className="font-body text-caption leading-5 text-text-secondary">
              Keep your progress context up to date.
            </Text>
          </View>
          <IconButton
            icon="plus"
            iconSize={16}
            label="Log body weight"
            onPress={() => {}} // TODO: open weight entry
          />
        </View>

        <ConsistencyGrid sessionDates={[]} mode="recent" />
        <Section title="Last session">
          <InfoCard
            title="No sessions yet"
            description="Your completed workouts will appear here."
          />
        </Section>
        <Button
          variant="outline"
          icon="pen-to-square"
          label="Edit your schedule"
          onPress={() => router.push("/schedule")}
        />
      </ScrollView>

      <View className="absolute bottom-md left-lg right-lg">
        <Button
          label="Start workout"
          onPress={() => router.push("/(tabs)/routines")}
        />
      </View>
    </View>
  );
}
