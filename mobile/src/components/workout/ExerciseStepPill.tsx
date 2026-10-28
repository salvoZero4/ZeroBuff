import { Pressable, Text, View } from "react-native";
import { Icon } from "../ui/Icon";

type ExerciseStepPillProps = {
  index: number;
  name: string;
  isActive: boolean;
  isCompleted: boolean;
  onPress: () => void;
};

export function ExerciseStepPill({
  index,
  name,
  isActive,
  isCompleted,
  onPress,
}: ExerciseStepPillProps) {
  const containerStyle = isActive
    ? "border-accent bg-accent"
    : isCompleted
      ? "border-accent/40 bg-surface-raised"
      : "border-border bg-surface";

  const textStyle = isActive
    ? "text-on-accent"
    : isCompleted
      ? "text-accent"
      : "text-text-secondary";

  return (
    <Pressable
      accessibilityLabel={`Exercise ${index + 1}: ${name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      className={`min-h-10 flex-row items-center gap-xs rounded-full border px-md ${containerStyle}`}
    >
      {isCompleted && !isActive ? (
        <Icon name="check" size={12} className="text-accent" />
      ) : (
        <Text className={`font-numeric-bold text-caption ${textStyle}`}>
          {index + 1}
        </Text>
      )}
      <Text
        numberOfLines={1}
        className={`font-body-semibold text-caption max-w-27.5 ${textStyle}`}
      >
        {name}
      </Text>
    </Pressable>
  );
}
