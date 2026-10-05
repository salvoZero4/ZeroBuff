import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
import { router } from "expo-router";
import { styled } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ConsistencyGrid } from "../ConsistencyGrid";
import { getWeekDays } from "@/utils/dates";
import { ScreenHeader } from "../ui/ScreenHeader";

const StyledFontAwesome6 = styled(FontAwesome6, {
  className: {
    target: "style",
    nativeStyleMapping: { color: "color" },
  },
});

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
        <View className="gap-xs">
          <View className="flex-row items-end justify-between gap-md">
            <ScreenHeader title="Your week" subtitle={today} />
          </View>
        </View>

        <View className="gap-sm">
          <Text className="font-body-semibold text-body text-text-primary">
            This week
          </Text>
          <View className="flex-row gap-xs rounded-md border border-border bg-surface p-sm">
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

        <View className="flex-1 gap-sm">
          <View className="flex-row items-center justify-between">
            <Text className="font-body-semibold text-body text-text-primary">
              Today&apos;s routine
            </Text>
          </View>
          <View className="gap-md rounded-md border border-border bg-surface p-lg">
            <View className="flex-1 gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                Rest day
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                No routine is scheduled for today.
              </Text>
            </View>
          </View>
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
            <StyledFontAwesome6
              name="plus"
              iconStyle="solid"
              className="text-accent"
              size={16}
            />
          </Pressable>
        </View>

        <ConsistencyGrid sessionDates={[]} mode="recent" />

        <View className="gap-sm">
          <Text className="font-body-semibold text-body text-text-primary">
            Last session
          </Text>
          <View className="flex-row items-center gap-md rounded-md border border-border bg-surface p-lg">
            <View className="flex-1 gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                No sessions yet
              </Text>
              <Text className="font-body text-caption leading-5 text-text-secondary">
                Your completed workouts will appear here.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Edit your schedule"
          accessibilityRole="button"
          className="min-h-14 flex-row items-center justify-center gap-sm rounded-sm border border-accent bg-surface active:bg-surface-raised"
          onPress={() => router.push("/schedule")}
        >
          <StyledFontAwesome6
            name="pen-to-square"
            iconStyle="solid"
            className="text-accent"
            size={16}
          />
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
