import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/Icon";

type ScheduleDayRowProps = {
  dayLabel: string;
  assignment: string | null;
  isLast?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function ScheduleDayRow({
  dayLabel,
  assignment,
  isLast = false,
  disabled = false,
  onPress,
}: ScheduleDayRowProps) {
  const isTrainingDay = assignment !== null;

  return (
    <Pressable
      accessibilityLabel={`${dayLabel}: ${assignment ?? "Rest"}`}
      accessibilityRole="button"
      className={`gap-md px-lg py-lg active:bg-surface-raised ${
        !isLast ? "border-b border-border" : ""
      }`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between gap-md">
        <Text className="font-body-semibold text-body text-text-primary">
          {dayLabel}
        </Text>
        <View className="flex-row items-center gap-md">
          <View
            className={`h-3 w-3 rounded-full ${
              isTrainingDay ? "bg-accent" : "bg-surface-raised"
            }`}
          />
          <Text
            className={`font-body text-caption ${
              isTrainingDay ? "text-accent" : "text-text-secondary"
            }`}
          >
            {assignment ?? "Rest"}
          </Text>
          <Icon
            name="chevron-right"
            size={14}
            className="text-text-secondary"
          />
        </View>
      </View>
    </Pressable>
  );
}
