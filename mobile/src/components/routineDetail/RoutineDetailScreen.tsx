import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoutineDraft } from "@/hooks/useRoutineDraft";
import {
  createRoutine,
  getRoutine,
  updateRoutine,
  type RoutineRead,
} from "@/utils/api/routines";
import {
  toRoutinePayload,
  type RoutineExerciseDraft,
} from "@/utils/domain/routineDraft";
import { openExercisePicker } from "@/utils/stores/exercisePickerStore";
import { ApiError } from "@/utils/api/errors";
import { ExerciseEditor } from "./ExerciseEditor";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Section } from "../ui/Section";
import { ScreenHeader } from "../ui/ScreenHeader";

export function RoutineDetailScreen({ routineId }: { routineId: string }) {
  const isNewRoutine = routineId === "new";

  const {
    data: routine,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["routines", routineId],
    queryFn: () => getRoutine(routineId),
    enabled: !isNewRoutine,
  });

  if (!isNewRoutine && isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#f5f5f5" />
      </View>
    );
  }

  if (!isNewRoutine && (isError || !routine)) {
    return (
      <View className="flex-1 items-center justify-center gap-lg bg-bg p-xl">
        <Text className="font-body-bold text-xl text-text-primary">
          Routine not found
        </Text>
        <Button
          variant="outline"
          label="Go back"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <RoutineEditorForm
      routineId={routineId}
      isNewRoutine={isNewRoutine}
      initialRoutine={routine}
    />
  );
}

function RoutineEditorForm({
  routineId,
  isNewRoutine,
  initialRoutine,
}: {
  routineId: string;
  isNewRoutine: boolean;
  initialRoutine?: RoutineRead;
}) {
  const {
    draft,
    setName,
    updateExercise,
    addExercise,
    removeExercise,
    reorderExercises,
  } = useRoutineDraft(initialRoutine);

  const [nameError, setNameError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { mutate: handleSave, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const payload = toRoutinePayload(draft);
      if (isNewRoutine) {
        return await createRoutine(payload);
      } else {
        return await updateRoutine(routineId, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      if (!isNewRoutine) {
        queryClient.invalidateQueries({ queryKey: ["routines", routineId] });
      }
      router.back();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setGeneralError(err.message || "Failed to save routine.");
      } else {
        setGeneralError("Network error. Please try again.");
      }
    },
  });

  function save() {
    const name = draft.name.trim();
    if (!name) {
      setNameError("Add a name before saving this routine.");
      return;
    }
    if (draft.exercises.length === 0) {
      setGeneralError("Add at least one exercise to your routine.");
      return;
    }
    setGeneralError(null);
    handleSave();
  }

  function handleOpenExercisePicker() {
    openExercisePicker((selectedExercise) => {
      addExercise(selectedExercise);
    });
    router.push("/exercises" as any);
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
            disabled={isSaving}
          >
            <Text
              className={`font-body-bold text-body ${
                isSaving ? "text-text-secondary" : "text-accent"
              }`}
            >
              {isSaving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        {generalError ? (
          <View className="rounded-sm border border-danger/40 bg-danger/10 p-md">
            <Text className="font-body text-caption text-danger">
              {generalError}
            </Text>
          </View>
        ) : null}

        <Section title="Routine name">
          <TextInput
            accessibilityLabel="Routine name"
            className="min-h-14 rounded-sm border border-border bg-surface px-lg font-body-medium text-body text-text-primary placeholder:text-text-secondary"
            onChangeText={(name) => {
              setName(name);
              if (name.trim()) setNameError(null);
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
          onPress={handleOpenExercisePicker}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
