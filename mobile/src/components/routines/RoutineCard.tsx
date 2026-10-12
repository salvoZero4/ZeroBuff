import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { Icon } from "../ui/Icon";

type RoutineCardProps = {
  name: string;
  muscleGroups: readonly string[];
  exerciseCount: number;
  onPress: () => void;
  onDelete: () => void;
};

function RightActionIndicator({ drag }: { drag: SharedValue<number> }) {
  // L'icona si ingrandisce e aumenta di opacità man mano che scorri verso sinistra
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      drag.value,
      [-100, -30],
      [1.15, 0.6],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      drag.value,
      [-60, -10],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View className="ml-sm min-w-24 items-center justify-center rounded-md bg-danger px-lg">
      <Animated.View style={animatedStyle}>
        <Icon name="trash" size={20} className="text-white" />
      </Animated.View>
    </View>
  );
}

export function RoutineCard({
  name,
  muscleGroups,
  exerciseCount,
  onPress,
  onDelete,
}: RoutineCardProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const muscleGroupsPreview = muscleGroups.join("   ");

  function handleTriggerDelete() {
    // Richiude con animazione fluida la riga e lancia la conferma
    swipeableRef.current?.close();
    onDelete();
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      rightThreshold={80} // Distanza di trascinamento necessaria per innescare l'azione
      onSwipeableWillOpen={handleTriggerDelete}
      renderRightActions={(_progress, drag) => (
        <RightActionIndicator drag={drag} />
      )}
    >
      <Pressable
        accessibilityLabel={`Open ${name} routine`}
        accessibilityRole="button"
        className="flex-row items-center gap-md rounded-md border border-border bg-surface p-lg active:bg-surface-raised"
        onPress={onPress}
      >
        <View className="flex-1 gap-xs">
          <Text className="font-body-bold text-xl text-text-primary">
            {name}
          </Text>
          <Text
            className="font-body text-caption text-text-secondary"
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
    </ReanimatedSwipeable>
  );
}
