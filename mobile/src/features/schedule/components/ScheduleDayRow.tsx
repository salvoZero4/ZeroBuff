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
      accessibilityState={{ disabled }}
      className={`min-h-14 flex-row items-center gap-md py-lg active:bg-surface ${!isLast ? "border-b border-border" : ""}`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="flex-1 gap-xs">
        <Text className="font-body-semibold text-body text-text-primary">
          {dayLabel}
        </Text>
        <Text
          className={`font-body text-caption ${isTrainingDay ? "text-text-primary" : "text-text-secondary"}`}
        >
          {assignment ?? "Rest"}
        </Text>
      </View>
      <Icon name="chevron-right" size={14} className="text-text-secondary" />
    </Pressable>
  );
}
