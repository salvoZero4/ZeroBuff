import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
import { Pressable, Text, View } from "react-native";
import { styled } from "nativewind";

import { Routine } from "../../utils/routineStore";

const StyledFontAwesome6 = styled(FontAwesome6, {
  className: { target: "style" },
});

type RoutineCardProps = {
  routine: Routine;
  onPress: () => void;
};

export function RoutineCard({ routine, onPress }: RoutineCardProps) {
  const muscleGroupsPreview = routine.muscleGroups.join(" · ");

  return (
    <Pressable
      accessibilityLabel={`Edit ${routine.name} routine`}
      accessibilityRole="button"
      className="flex-row items-center gap-md rounded-md border border-border bg-surface p-lg active:bg-surface-raised"
      onPress={onPress}
    >
      <View className="flex-1 gap-xs">
        <Text className="font-body-bold text-body text-text-primary">
          {routine.name}
        </Text>
        <Text className="font-body text-caption text-text-secondary">
          {routine.exercises.length}{" "}
          {routine.exercises.length === 1 ? "exercise" : "exercises"}
        </Text>
        {muscleGroupsPreview ? (
          <Text
            className="font-body text-caption text-text-disabled"
            numberOfLines={1}
          >
            {muscleGroupsPreview}
          </Text>
        ) : (
          <Text className="font-body text-caption text-text-disabled">
            No muscle groups
          </Text>
        )}
      </View>
      <StyledFontAwesome6
        name="chevron-right"
        iconStyle="solid"
        className="text-text-secondary"
        size={20}
      />
    </Pressable>
  );
}
