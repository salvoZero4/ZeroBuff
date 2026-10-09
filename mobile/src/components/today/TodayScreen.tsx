import { router } from "expo-router";
import { Icon } from "../ui/Icon";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ConsistencyGrid } from "../shared/ConsistencyGrid";
import { getWeekDays } from "@/utils/dates";
import { ScreenHeader } from "../ui/ScreenHeader";

import { InfoCard } from "./InfoCard";
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

        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <Text className="font-body-semibold text-body text-text-primary">
              Today&apos;s routine
            </Text>
          </View>
          <InfoCard
            title="Rest day"
            description="No routine is scheduled for today."
          />
        </View>

        <View className="flex-row items-center gap-md rounded-md border border-accent/30 bg-surface-raised p-lg">
          <View className="flex-1 gap-xs">
            <Text className="font-body-semibold text-body text-text-primary">
              Track body weight
            </Text>
            <Text className="font-body text-caption leading-5 text-text-secondary">
              Keep your progress context up to date.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Log body weight"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
          >
            <Icon name="plus" />
          </Pressable>
        </View>

        <ConsistencyGrid sessionDates={[]} mode="recent" />

        <View className="gap-sm">
          <Text className="font-body-semibold text-body text-text-primary">
            Last session
          </Text>
          <InfoCard
            title="No sessions yet"
            description="Your completed workouts will appear here."
          />
        </View>

        <Pressable
          accessibilityLabel="Edit your schedule"
          accessibilityRole="button"
          className="min-h-14 flex-row items-center justify-center gap-sm rounded-sm border border-accent bg-surface active:bg-surface-raised"
          onPress={() => router.push("/schedule")}
        >
          <Icon name="pen-to-square" />
          <Text className="font-body-semibold text-body text-text-primary">
            Edit your schedule
          </Text>
        </Pressable>
      </ScrollView>

      <View className="absolute bottom-md left-lg right-lg rounded-md bg-accent">
        <Pressable
          accessibilityLabel="Start workout"
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-md active:bg-accent-pressed"
          onPress={() => router.push("/(tabs)/routines")}
        >
          <Text className="font-body-bold text-xl text-on-accent">
            Start workout
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
