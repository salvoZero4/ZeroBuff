import { type RoutineExerciseDraft } from "@/features/routines/utils/routineDraft";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { TargetInput } from "@/features/routines/components/TargetInput";
import { formatRestDuration } from "../utils/restDuration";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

type ExerciseEditorProps = {
  exercise: RoutineExerciseDraft;
  onChange: (changes: Partial<RoutineExerciseDraft>) => void;
  onRemove: () => void;
  onEditRest: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  drag: () => void;
  isActive: boolean;
  disabled?: boolean;
  isLast: boolean;
};

export function ExerciseEditor({
  exercise,
  onChange,
  onRemove,
  onEditRest,
  onMoveUp,
  onMoveDown,
  drag,
  isActive,
  disabled = false,
  isLast,
}: ExerciseEditorProps) {
  const { fontScale } = useWindowDimensions();
  // Both native inputs and the rest selector share an explicit, text-scaled height.
  const fieldHeight = Math.max(48, Math.ceil(32 * fontScale));
  const reorderDisabled = disabled || isActive;
  const showReorderButtons = Boolean(onMoveUp || onMoveDown);
  return (
    <View
      className={`relative gap-sm px-sm py-lg ${isLast ? "" : "border-b border-border"} ${isActive ? "rounded-md bg-surface-raised" : "bg-bg"}`}
    >
      {isActive && (
        <View
          pointerEvents="none"
          className="absolute inset-0 rounded-md border border-text-secondary"
        />
      )}
      <View className="flex-row items-center gap-sm">
        <Pressable
          accessible={false}
          disabled={disabled}
          onLongPress={drag}
          delayLongPress={300}
          className={`min-h-12 flex-1 flex-row items-center gap-sm rounded-sm ${isActive ? "" : "active:bg-surface"}`}
        >
          <View className="min-h-12 w-8 items-center justify-center">
            <View
              className={`h-8 w-8 items-center justify-center rounded-sm ${isActive ? "bg-accent" : ""}`}
            >
              <Icon
                name="grip-vertical"
                size={16}
                className={isActive ? "text-on-accent" : "text-text-secondary"}
              />
            </View>
          </View>
          <Text className="flex-1 font-body-semibold text-body text-text-primary">
            {exercise.name}
          </Text>
        </Pressable>
        {showReorderButtons && (
          <View className="flex-row">
            <IconButton
              variant="bare"
              icon="chevron-up"
              iconSize={16}
              label={`Move up: ${exercise.name}`}
              disabled={reorderDisabled || !onMoveUp}
              iconClassName={reorderDisabled || !onMoveUp ? "text-text-disabled" : "text-text-primary"}
              onPress={() => onMoveUp?.()}
            />
            <IconButton
              variant="bare"
              icon="chevron-down"
              iconSize={16}
              label={`Move down: ${exercise.name}`}
              disabled={reorderDisabled || !onMoveDown}
              iconClassName={reorderDisabled || !onMoveDown ? "text-text-disabled" : "text-text-primary"}
              onPress={() => onMoveDown?.()}
            />
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${exercise.name}`}
          disabled={disabled || isActive}
          accessibilityState={{ disabled: disabled || isActive }}
          onPress={onRemove}
          className={`min-h-12 min-w-12 items-center justify-center rounded-sm active:bg-surface ${isActive ? "opacity-0" : ""}`}
        >
          <Icon name="xmark" size={18} className="text-text-secondary" />
        </Pressable>
      </View>
      <View className={`flex-row gap-sm ${isActive ? "opacity-70" : ""}`}>
        <TargetInput
          height={fieldHeight}
          disabled={disabled || isActive}
          label="Sets"
          accessibilityLabel={`${exercise.name} sets`}
          value={exercise.sets}
          onChangeText={(sets) => onChange({ sets })}
        />
        <TargetInput
          height={fieldHeight}
          disabled={disabled || isActive}
          label="Reps"
          accessibilityLabel={`${exercise.name} reps`}
          value={exercise.reps}
          onChangeText={(reps) => onChange({ reps })}
        />
        <View className="flex-1 gap-xs">
          <Text className="font-body text-caption text-text-secondary">
            Rest
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${exercise.name} rest: ${formatRestDuration(Number(exercise.restSeconds))}, minutes and seconds`}
            disabled={disabled || isActive}
            onPress={onEditRest}
            style={{ height: fieldHeight }}
            className="min-h-12 flex-row items-center justify-center gap-xs rounded-sm border border-border bg-surface px-sm"
          >
            <Text className="font-numeric text-xl text-text-primary">
              {formatRestDuration(Number(exercise.restSeconds))}
            </Text>
            <Icon
              name="chevron-down"
              size={10}
              className="text-text-secondary"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
