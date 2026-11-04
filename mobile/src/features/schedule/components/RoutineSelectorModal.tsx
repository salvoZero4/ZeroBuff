import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/IconButton";
import type { RoutineListRead } from "@/features/routines/types";
import { RoutineOptionItem } from "@/features/schedule/components/RoutineOptionItem";

type RoutineSelectorModalProps = {
  visible: boolean;
  dayLabel?: string;
  routines: readonly RoutineListRead[];
  selectedRoutineId: string | null;
  isPending?: boolean;
  error?: string | null;
  onSelect: (routineId: string | null) => void;
  onClose: () => void;
};

export function RoutineSelectorModal({
  visible,
  dayLabel,
  routines,
  selectedRoutineId,
  onSelect,
  isPending = false,
  error,
  onClose,
}: RoutineSelectorModalProps) {
  const insets = useSafeAreaInsets();
  const close = () => {
    if (!isPending) onClose();
  };
  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      transparent
      visible={visible}
    >
      <View className="flex-1 justify-end bg-black/75">
        <Pressable
          accessibilityLabel="Close routine selector"
          accessibilityRole="button"
          className="absolute inset-0"
          disabled={isPending}
          onPress={close}
        />
        <View
          accessibilityViewIsModal
          className="max-h-[85%] gap-md rounded-t-lg border-t border-border bg-bg p-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center gap-md">
            <View className="flex-1 gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                {dayLabel}
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Choose a routine or make this a rest day.
              </Text>
            </View>
            <IconButton
              icon="xmark"
              label="Close routine selector"
              variant="bare"
              disabled={isPending}
              onPress={close}
            />
          </View>
          {isPending && (
            <Text
              accessibilityLiveRegion="polite"
              className="font-body text-caption text-text-secondary"
            >
              Saving schedule…
            </Text>
          )}
          {error && (
            <Text
              accessibilityRole="alert"
              className="font-body text-caption text-danger"
            >
              {error}
            </Text>
          )}
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {routines.map((routine) => (
              <RoutineOptionItem
                disabled={isPending}
                key={routine.id}
                label={routine.name}
                selected={selectedRoutineId === routine.id}
                onPress={() => onSelect(routine.id)}
              />
            ))}
            <RoutineOptionItem
              disabled={isPending}
              isLast
              label="Rest"
              selected={selectedRoutineId === null}
              onPress={() => onSelect(null)}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
