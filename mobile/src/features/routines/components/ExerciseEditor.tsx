import { type RoutineExerciseDraft } from "@/features/routines/utils/routineDraft";
import { View, Text, Pressable } from "react-native";
import { TargetInput } from "@/features/routines/components/TargetInput";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

type ExerciseEditorProps = {
  exercise: RoutineExerciseDraft;
  onChange: (changes: Partial<RoutineExerciseDraft>) => void;
  onRemove: () => void;
  drag: () => void;
  isActive: boolean;
};

export function ExerciseEditor({
  exercise,
  onChange,
  onRemove,
  drag,
  isActive,
}: ExerciseEditorProps) {
  return (
    <Card
      className={`gap-md ${
        isActive ? "border-surface bg-surface-raised shadow-md" : ""
      }`}
    >
      <View className="flex-row items-center gap-md">
        <Pressable
          accessibilityLabel={`Drag to reorder ${exercise.name}`}
          accessibilityRole="button"
          hitSlop={8}
          onLongPress={drag}
          className={`h-10 w-10 items-center justify-center rounded-full ${
            isActive ? "bg-accent" : "bg-surface-raised"
          }`}
        >
          <Icon
            name="grip-vertical"
            size={16}
            className={isActive ? "text-on-accent" : "text-text-secondary"}
          />
        </Pressable>

        <Text className="flex-1 border-border px-xs font-body-semibold text-lg text-text-primary">
          {exercise.name}
        </Text>

        <IconButton
          variant="bare"
          icon="trash"
          iconClassName="text-danger"
          label={`Remove ${exercise.name}`}
          onPress={onRemove}
        />
      </View>

      <View className="flex-row gap-sm">
        <TargetInput
          label="Sets"
          value={exercise.sets}
          onChangeText={(sets) => onChange({ sets })}
        />
        <TargetInput
          label="Reps"
          value={exercise.reps}
          onChangeText={(reps) => onChange({ reps })}
        />
        <TargetInput
          label="Rest (sec)"
          value={exercise.restSeconds}
          onChangeText={(restSeconds) => onChange({ restSeconds })}
        />
      </View>
    </Card>
  );
}
