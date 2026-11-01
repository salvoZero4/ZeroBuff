import { Modal, Pressable, Text, View } from "react-native";
import type { RoutineListRead } from "@/features/routines/types";
import { RoutineOptionItem } from "@/features/schedule/components/RoutineOptionItem";

type RoutineSelectorModalProps = {
  visible: boolean;
  dayLabel?: string;
  routines: readonly RoutineListRead[];
  selectedRoutineId: string | null;
  onSelect: (routineId: string | null) => void;
  onClose: () => void;
};

export function RoutineSelectorModal({
  visible,
  dayLabel,
  routines,
  selectedRoutineId,
  onSelect,
  onClose,
}: RoutineSelectorModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable
          accessibilityLabel="Close routine selector"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onClose}
        />
        <View
          onStartShouldSetResponder={() => true}
          className="gap-lg rounded-t-lg border border-border bg-surface p-lg"
        >
          <View className="gap-xs">
            <Text className="font-body-bold text-xl text-text-primary">
              {dayLabel}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              Choose a routine or make this a rest day.
            </Text>
          </View>
          <View className="gap-sm">
            {routines.map((routine) => (
              <RoutineOptionItem
                key={routine.id}
                label={routine.name}
                selected={selectedRoutineId === routine.id}
                onPress={() => onSelect(routine.id)}
              />
            ))}
            <RoutineOptionItem
              label="Rest"
              selected={selectedRoutineId === null}
              onPress={() => onSelect(null)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
