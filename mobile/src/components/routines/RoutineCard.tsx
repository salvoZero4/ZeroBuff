// components/routines/RoutineCard.tsx
import { Pressable, Text, View } from "react-native";

import { Icon } from "../ui/Icon";

type RoutineCardProps = {
  name: string;
  muscleGroups: readonly string[];
  exerciseCount: number;
  onPress: () => void;
};

export function RoutineCard({
  name,
  muscleGroups,
  exerciseCount,
  onPress,
}: RoutineCardProps) {
  const muscleGroupsPreview = muscleGroups.join(" · ");

  return (
    <Pressable
      accessibilityLabel={`Open ${name} routine`}
      accessibilityRole="button"
      className="flex-row items-center gap-md rounded-md border border-border bg-surface p-lg active:bg-surface-raised"
      onPress={onPress}
    >
      <View className="flex-1 gap-xs">
        <Text className="font-body-bold text-xl text-text-primary">{name}</Text>
        <Text
          className="font-body text-caption text-text-disabled"
          numberOfLines={1}
        >
          {muscleGroupsPreview || "No muscle groups"}
        </Text>
      </View>
      <View className="items-end gap-xs">
        <Text className="font-numeric-bold text-xl text-accent">
          {exerciseCount}
        </Text>
        <Text className="font-body text-caption text-text-secondary">
          {exerciseCount === 1 ? "exercise" : "exercises"}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} className="text-text-secondary" />
    </Pressable>
  );
}
