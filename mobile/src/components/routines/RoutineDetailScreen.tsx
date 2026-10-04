import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
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
import { styled } from "nativewind";

import { nativeColors } from "@/theme/nativeColors";

import {
  getRoutine,
  Routine,
  RoutineExercise,
  saveRoutine,
} from "./routineStore";

const StyledFontAwesome6 = styled(FontAwesome6, {
  className: { target: "style" },
});

type RoutineExerciseDraft = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  restSeconds: string;
};

type RoutineDraft = {
  name: string;
  muscleGroups: string[];
  exercises: RoutineExerciseDraft[];
};

function toDraft(routine: Routine | undefined): RoutineDraft {
  return {
    name: routine?.name ?? "",
    muscleGroups: routine?.muscleGroups ?? [],
    exercises:
      routine?.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: String(exercise.sets),
        reps: String(exercise.reps),
        restSeconds: String(exercise.restSeconds),
      })) ?? [],
  };
}

function toRoutine(routineId: string, draft: RoutineDraft): Routine {
  const exercises: RoutineExercise[] = draft.exercises.map(
    (exercise, index) => ({
      id: exercise.id,
      name: exercise.name.trim() || `Exercise ${index + 1}`,
      sets: Math.max(1, Number.parseInt(exercise.sets, 10) || 1),
      reps: Math.max(1, Number.parseInt(exercise.reps, 10) || 1),
      restSeconds: Math.max(0, Number.parseInt(exercise.restSeconds, 10) || 0),
    }),
  );

  return {
    id: routineId,
    name: draft.name.trim(),
    muscleGroups: draft.muscleGroups,
    exercises,
  };
}

export function RoutineDetailScreen({ routineId }: { routineId: string }) {
  const routine = routineId === "new" ? undefined : getRoutine(routineId);
  const [draft, setDraft] = useState<RoutineDraft>(() => toDraft(routine));
  const [nameError, setNameError] = useState<string | null>(null);
  const isNewRoutine = routineId === "new";

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

  function updateExercise(
    exerciseId: string,
    changes: Partial<RoutineExerciseDraft>,
  ) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      exercises: currentDraft.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, ...changes } : exercise,
      ),
    }));
  }

  function addExercise() {
    const exerciseId = `exercise-${Date.now()}`;
    setDraft((currentDraft) => ({
      ...currentDraft,
      exercises: [
        ...currentDraft.exercises,
        {
          id: exerciseId,
          name: `Exercise ${currentDraft.exercises.length + 1}`,
          sets: "3",
          reps: "10",
          restSeconds: "90",
        },
      ],
    }));
  }

  function removeExercise(exerciseId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      exercises: currentDraft.exercises.filter(
        (exercise) => exercise.id !== exerciseId,
      ),
    }));
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
      className="flex-1 bg-bg"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-md pb-xl"
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
            <StyledFontAwesome6
              name="arrow-left"
              iconStyle="solid"
              className="text-text-primary"
              size={18}
            />
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
            className="min-h-14 rounded-sm border border-border bg-surface px-lg font-body text-body text-text-primary"
            onChangeText={(name) => {
              setDraft((currentDraft) => ({ ...currentDraft, name }));
              if (name.trim()) {
                setNameError(null);
              }
            }}
            placeholder="e.g. Push day"
            placeholderTextColor={nativeColors.textSecondary}
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
                  onRemove={() => removeExercise(exercise.id)}
                />
              ))}
            </View>
          ) : (
            <View className="rounded-md border border-border bg-surface p-lg">
              <Text className="font-body text-body leading-6 text-text-secondary">
                This routine is empty. Add an exercise when you&apos;re ready.
              </Text>
            </View>
          )}

          <Pressable
            accessibilityLabel="Add exercise"
            accessibilityRole="button"
            className="min-h-14 flex-row items-center justify-center gap-sm rounded-sm border border-accent px-lg active:bg-surface-raised"
            onPress={addExercise}
          >
            <StyledFontAwesome6
              name="plus"
              iconStyle="solid"
              className="text-accent"
              size={15}
            />
            <Text className="font-body-bold text-body text-accent">
              Add exercise
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type ExerciseEditorProps = {
  exercise: RoutineExerciseDraft;
  index: number;
  onChange: (changes: Partial<RoutineExerciseDraft>) => void;
  onRemove: () => void;
};

function ExerciseEditor({
  exercise,
  index,
  onChange,
  onRemove,
}: ExerciseEditorProps) {
  return (
    <View className="gap-md rounded-md border border-border bg-surface p-lg">
      <View className="flex-row items-center gap-md">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-raised">
          <Text className="font-numeric-bold text-body text-accent">
            {index + 1}
          </Text>
        </View>
        <TextInput
          accessibilityLabel={`Exercise ${index + 1} name`}
          className="min-h-12 flex-1 border-b border-border px-xs font-body-semibold text-body text-text-primary"
          onChangeText={(name) => onChange({ name })}
          placeholder="Exercise name"
          placeholderTextColor={nativeColors.textSecondary}
          value={exercise.name}
        />
        <Pressable
          accessibilityLabel={`Remove ${exercise.name}`}
          accessibilityRole="button"
          className="h-12 w-12 items-center justify-center rounded-sm"
          onPress={onRemove}
        >
          <StyledFontAwesome6
            name="trash"
            iconStyle="solid"
            className="text-text-secondary"
            size={16}
          />
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

type TargetInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

function TargetInput({ label, value, onChangeText }: TargetInputProps) {
  return (
    <View className="flex-1 gap-xs">
      <Text className="font-body text-caption text-text-secondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        className="min-h-12 rounded-sm border border-border bg-surface-raised px-sm text-center font-numeric text-body text-text-primary"
        keyboardType="number-pad"
        onChangeText={onChangeText}
        value={value}
      />
    </View>
  );
}
