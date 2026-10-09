import { type RoutineExerciseDraft } from "@/utils/routineDraft";
import { View, TextInput, Pressable } from "react-native";
import { TargetInput } from "./TargetInput";
import { IconButton } from "../ui/IconButton";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

type ExerciseEditorProps = {
  exercise: RoutineExerciseDraft;
  index: number;
  onChange: (changes: Partial<RoutineExerciseDraft>) => void;
  onRemove: () => void;
  drag: () => void;
  isActive: boolean;
};

export function ExerciseEditor({
  exercise,
  index,
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

        <TextInput
          accessibilityLabel={`Exercise ${index + 1} name`}
          className="min-h-12 flex-1 border-border px-xs font-body-semibold text-xl text-text-primary"
          onChangeText={(name) => onChange({ name })}
          placeholder="Exercise name"
          value={exercise.name}
        />

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
