import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { type RoutineExerciseDraft, toRoutine } from "@/utils/routineDraft";
import { Icon } from "../ui/Icon";
import { getRoutine, saveRoutine } from "@/utils/routineStore";
import { Button } from "../ui/Button";
import { useRoutineDraft } from "@/hooks/useRoutineDraft";
import { ExerciseEditor } from "./ExerciseEditor";

export function RoutineDetailScreen({ routineId }: { routineId: string }) {
  const isNewRoutine = routineId === "new";
  const routine = isNewRoutine ? undefined : getRoutine(routineId);
  const {
    draft,
    setName,
    updateExercise,
    addExercise,
    removeExercise,
    moveExercise,
  } = useRoutineDraft(routine);
  const [nameError, setNameError] = useState<string | null>(null);

  if (!isNewRoutine && !routine) {
    return (
      <View className="flex-1 items-center justify-center gap-lg bg-bg p-xl">
        <Text className="font-body-bold text-xl text-text-primary">
          Routine not found
        </Text>
        <Pressable
          accessibilityRole="button"
          className="min-h-12 justify-center rounded-sm border border-accent px-lg"
          onPress={() => router.back()}
        >
          <Text className="font-body-bold text-body text-accent">Go back</Text>
        </Pressable>
      </View>
    );
  }

  function save() {
    const name = draft.name.trim();
    if (!name) {
      setNameError("Add a name before saving this routine.");
      return;
    }

    saveRoutine(toRoutine(routineId, draft));
    router.back();
  }

  return (
    <KeyboardAvoidingView
      className="bg-bg flex-1"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 40}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-md">
          <Pressable
            accessibilityLabel="Go back to routines"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center rounded-full bg-surface"
            onPress={() => router.back()}
          >
            <Icon name="arrow-left" size={20} />
          </Pressable>
          <View className="flex-1 gap-xs">
            <Text className="font-body-bold text-xl text-text-primary">
              {isNewRoutine ? "New routine" : "Edit routine"}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              Shape this workout around how you train.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Save routine"
            accessibilityRole="button"
            className="min-h-12 min-w-12 items-center justify-center rounded-sm px-sm active:bg-surface-raised"
            onPress={save}
          >
            <Text className="font-body-bold text-body text-accent">Save</Text>
          </Pressable>
        </View>

        <View className="gap-sm">
          <Text className="font-body-semibold text-body text-text-primary">
            Routine name
          </Text>
          <TextInput
            accessibilityLabel="Routine name"
            className="min-h-14 rounded-sm border border-border bg-surface px-lg font-body-medium text-body text-text-primary placeholder:text-text-secondary"
            onChangeText={(name) => {
              setName(name);
              if (name.trim()) {
                setNameError(null);
              }
            }}
            placeholder="e.g. Push day"
            value={draft.name}
          />
          {nameError ? (
            <Text className="font-body text-caption text-danger">
              {nameError}
            </Text>
          ) : null}
        </View>

        <View className="gap-sm">
          <View className="flex-row items-end justify-between gap-md">
            <View className="flex-1 gap-xs">
              <Text className="font-body-semibold text-body text-text-primary">
                Exercises
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Add the movements and targets for this routine.
              </Text>
            </View>
            <Text className="font-numeric-bold text-title text-accent">
              {draft.exercises.length}
            </Text>
          </View>

          {draft.exercises.length > 0 ? (
            <View className="gap-sm">
              {draft.exercises.map((exercise, index) => (
                <ExerciseEditor
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  onChange={(changes) => updateExercise(exercise.id, changes)}
                  onMove={moveExercise}
                  onRemove={() => removeExercise(exercise.id)}
                />
              ))}
            </View>
          ) : (
            <View className="rounded-md border border-border bg-surface p-lg">
              <Text className="font-body text-body leading-6 text-text-secondary">
                This routine is empty. Add exercises to create a complete
                workout.
              </Text>
            </View>
          )}

          <Button
            variant="outline"
            icon="plus"
            label="Add exercise"
            onPress={addExercise}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
