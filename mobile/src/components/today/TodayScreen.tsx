import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { styled } from "nativewind";
import { ConsistencyGrid } from "./ConsistencyGrid";
import { getWeekDays } from "@/utils/dates";
import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";

const StyledFontAwesome6 = styled(FontAwesome6, {
  className: {
    target: "style",
    nativeStyleMapping: { color: "color" },
  },
});

export function TodayScreen() {
  const weekDays = getWeekDays();

  const plusIcon = (
    <StyledFontAwesome6
      name="plus"
      iconStyle="solid"
      className="text-accent"
      size={16}
    />
  );

  return (
    <View className="flex-1 bg-bg">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="gap-lg bg-bg p-md pb-[148px]">
          <View className="flex-row items-center justify-between gap-md">
            <View className="flex-1 gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                Your Week Workouts
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Here&apos;s what you have planned for this week.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Edit your schedule"
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center"
              onPress={() => router.push("/schedule")}
            >
              <StyledFontAwesome6
                name="pen-to-square"
                iconStyle="solid"
                className="text-accent"
                size={20}
              />
            </Pressable>
          </View>
          <View className="flex-row items-center gap-xs bg-surface p-sm rounded-sm">
            {weekDays.map((day) => (
              <View
                key={day.date}
                className={`flex-1 aspect-square items-center justify-center rounded-sm border px-sm pt-sm pb-[14px] ${
                  day.isToday
                    ? "border-accent bg-accent"
                    : "border-border bg-surface-raised"
                }`}
              >
                <Text
                  className={`font-body-bold text-body ${
                    day.isToday ? "text-on-accent" : "text-text-secondary"
                  }`}
                >
                  {day.label}
                </Text>
                <Text
                  className={`font-numeric-bold text-numeric ${
                    day.isToday ? "text-on-accent" : "text-text-primary"
                  }`}
                >
                  {day.number}
                </Text>
              </View>
            ))}
          </View>

          <View className="gap-sm">
            <Text className="font-body-semibold text-body text-text-primary">
              Today&apos;s routine
            </Text>
            <View className="gap-sm rounded-md border border-border bg-surface p-lg">
              <Text className="font-body-bold text-xl text-text-primary">
                Rest day
              </Text>
              <Text className="font-body text-body leading-6 text-text-secondary">
                No routine is scheduled for today.
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between gap-md rounded-md bg-surface-raised p-lg">
            <View className="flex-1 gap-xs">
              <Text className="font-body-semibold text-body text-text-primary">
                Track your body weight
              </Text>
              <Text className="font-body text-caption leading-5 text-text-secondary">
                Keep your progress context up to date.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
            >
              {plusIcon}
            </Pressable>
          </View>

          <ConsistencyGrid sessionDates={[]} mode="recent" />

          <View className="gap-sm">
            <Text className="font-body-semibold text-body text-text-primary">
              Last session
            </Text>
            <View className="gap-sm rounded-md border border-border bg-surface p-lg">
              <Text className="font-body-bold text-xl text-text-primary">
                No sessions yet
              </Text>
              <Text className="font-body text-body leading-6 text-text-secondary">
                Your completed workouts will appear here.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-md left-lg right-lg rounded-md bg-accent">
        <Pressable
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-sm active:bg-accent-pressed"
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
