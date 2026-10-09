import { RoutineExerciseDraft } from "@/utils/routineDraft";
import { View, Text, Pressable, TextInput } from "react-native";
import { TargetInput } from "./TargetInput";
import { Icon } from "../ui/Icon";

type ExerciseEditorProps = {
  exercise: RoutineExerciseDraft;
  index: number;
  onChange: (changes: Partial<RoutineExerciseDraft>) => void;
  onMove: (exerciseId: string, direction: -1 | 1) => void;
  onRemove: () => void;
};

export function ExerciseEditor({
  exercise,
  index,
  onChange,
  onMove,
  onRemove,
}: ExerciseEditorProps) {
  return (
    <View className="gap-md rounded-md border border-border bg-surface p-lg">
      <View className="flex-row items-center gap-md">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-raised">
          <Text className="font-numeric-bold text-body text-accent">
            {index + 1}
          </Text>
        </View>
        <TextInput
          accessibilityLabel={`Exercise ${index + 1} name`}
          className="min-h-12 flex-1 border-border px-xs font-body-semibold text-xl text-text-primary"
          onChangeText={(name) => onChange({ name })}
          placeholder="Exercise name"
          value={exercise.name}
        />
        <View className="flex-row items-center">
          <Pressable
            accessibilityLabel={`Move ${exercise.name} up`}
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center"
            onPress={() => onMove(exercise.id, -1)}
          >
            <Icon name="chevron-up" size={15} />
          </Pressable>
          <Pressable
            accessibilityLabel={`Move ${exercise.name} down`}
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center"
            onPress={() => onMove(exercise.id, 1)}
          >
            <Icon name="chevron-down" size={15} />
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel={`Remove ${exercise.name}`}
          accessibilityRole="button"
          className="h-12 w-12 items-center justify-center rounded-sm"
          onPress={onRemove}
        >
          <Icon name="trash" size={20} className="text-danger" />
        </Pressable>
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
    </View>
  );
}
