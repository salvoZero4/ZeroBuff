import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useRoutineDraft } from "@/hooks/useRoutineDraft";
import { getRoutine, saveRoutine } from "@/utils/routineStore";
import { toRoutine, type RoutineExerciseDraft } from "@/utils/routineDraft";
import { ExerciseEditor } from "./ExerciseEditor";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Section } from "../ui/Section";
import { ScreenHeader } from "../ui/ScreenHeader";

export function RoutineDetailScreen({ routineId }: { routineId: string }) {
  const isNewRoutine = routineId === "new";
  const routine = isNewRoutine ? undefined : getRoutine(routineId);
  const {
    draft,
    setName,
    updateExercise,
    addExercise,
    removeExercise,
    reorderExercises,
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

  function renderExerciseItem({
    item,
    getIndex,
    drag,
    isActive,
  }: RenderItemParams<RoutineExerciseDraft>) {
    const index = getIndex() ?? 0;
    return (
      <View className="pb-sm">
        <ExerciseEditor
          exercise={item}
          index={index}
          onChange={(changes) => updateExercise(item.id, changes)}
          onRemove={() => removeExercise(item.id)}
          drag={drag}
          isActive={isActive}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
    >
      <View className="gap-md px-lg pb-md pt-lg">
        <View className="flex-row items-center gap-md">
          <IconButton
            icon="arrow-left"
            label="Go back to routines"
            onPress={() => router.back()}
          />
          <View className="flex-1">
            <ScreenHeader
              title={isNewRoutine ? "New routine" : "Edit routine"}
              subtitle="Shape this workout around how you train."
            />
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

        <Section title="Routine name">
          <TextInput
            accessibilityLabel="Routine name"
            className="min-h-14 rounded-sm border border-border bg-surface px-lg font-body-medium text-body text-text-primary placeholder:text-text-secondary"
            onChangeText={(name) => {
              setName(name);
              if (name.trim()) {
                setNameError(null);
              }
            }}
            placeholder="e.g. Push Day"
            value={draft.name}
          />
          {nameError ? (
            <Text className="font-body text-caption text-danger">
              {nameError}
            </Text>
          ) : null}
        </Section>
      </View>

      <View className="flex-1 px-lg pt-sm">
        <Section title="Exercises" className="flex-1">
          {draft.exercises.length > 0 ? (
            <DraggableFlatList
              data={draft.exercises}
              onDragEnd={({ data }) => reorderExercises(data)}
              keyExtractor={(item) => item.id}
              renderItem={renderExerciseItem}
              showsVerticalScrollIndicator={false}
              containerStyle={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <Card>
              <Text className="font-body text-body leading-6 text-text-secondary">
                This routine is empty. Add exercises to create a complete
                workout.
              </Text>
            </Card>
          )}
        </Section>
      </View>

      <View className="p-lg">
        <Button
          variant="outline"
          icon="plus"
          label="Add exercise"
          onPress={addExercise}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
