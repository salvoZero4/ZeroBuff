import { routineKeys } from "@/features/routines/api/queryKeys";
import { router, usePreventRemove } from "expo-router";
import { useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Keyboard,
  Pressable,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoutineDraft } from "@/features/routines/hooks/useRoutineDraft";
import {
  createRoutine,
  getRoutine,
  updateRoutine,
} from "@/features/routines/api/routines";
import type { RoutineRead } from "@/features/routines/types/routine";
import {
  toRoutinePayload,
  routineDraftSignature,
  type RoutineExerciseDraft,
} from "@/features/routines/utils/routineDraft";
import { openExercisePicker } from "@/features/exercises/store/exercisePickerStore";
import { ApiError } from "@/shared/api/errors";
import { RestDurationModal } from "@/features/routines/components/RestDurationModal";
import { formatRestDuration } from "@/features/routines/utils/restDuration";
import { Icon } from "@/components/ui/Icon";
import { ExerciseEditor } from "@/features/routines/components/ExerciseEditor";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Section } from "@/components/ui/Section";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export function RoutineDetailScreen({ routineId }: { routineId: string }) {
  const isNewRoutine = routineId === "new";

  const {
    data: routine,
    isLoading,
    isError,
  } = useQuery({
    queryKey: routineKeys.detail(routineId),
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
    setRestForAll,
    updateExercise,
    addExercise,
    removeExercise,
    moveExercise,
    reorderExercises,
  } = useRoutineDraft(initialRoutine);

  const [restTarget, setRestTarget] = useState<string | null>(null);
  const uniformRest =
    draft.exercises.length > 0 &&
    draft.exercises.every(
      (exercise) => exercise.restSeconds === draft.exercises[0].restSeconds,
    );
  const [baseline] = useState(() => routineDraftSignature(draft));
  const [leaving, setLeaving] = useState(false);
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null);
  const saveInFlight = useRef(false);
  const dragInFlight = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollOffset = useRef(0);
  const [listLayout, setListLayout] = useState({ revision: 0, offset: 0 });
  const hasChanges = routineDraftSignature(draft) !== baseline;

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
      setLeaving(true);
      disableExitProtection();
      queryClient.invalidateQueries({ queryKey: routineKeys.all });
      router.back();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setGeneralError(err.message || "Failed to save routine.");
      } else {
        setGeneralError("Network error. Please try again.");
      }
    },
    onSettled: () => {
      saveInFlight.current = false;
    },
  });

  const disableExitProtection = usePreventRemove(
    !leaving && (hasChanges || isSaving || isDragging),
    ({ repeat }) => {
      if (!saveInFlight.current && !dragInFlight.current)
        setPendingExit(() => repeat);
    },
  );

  function save() {
    if (saveInFlight.current || dragInFlight.current) return;
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
    saveInFlight.current = true;
    handleSave();
  }

  function handleOpenExercisePicker() {
    if (saveInFlight.current || dragInFlight.current) return;
    openExercisePicker((selectedExercise) => {
      addExercise(selectedExercise);
    });
    router.push("/exercises");
  }

  function renderExerciseItem({
    item,
    drag,
    isActive,
  }: RenderItemParams<RoutineExerciseDraft>) {
    const index = draft.exercises.findIndex((exercise) => exercise.id === item.id);
    const isLast = index === draft.exercises.length - 1;

    function move(direction: -1 | 1) {
      if (saveInFlight.current || dragInFlight.current) return;
      moveExercise(item.id, direction);
      AccessibilityInfo.announceForAccessibility(
        `${item.name} moved to position ${index + direction + 1} of ${draft.exercises.length}.`,
      );
    }

    return (
      <View>
        <ExerciseEditor
          disabled={isSaving || (isDragging && !isActive)}
          isLast={isLast}
          exercise={item}
          onMoveUp={index > 0 ? () => move(-1) : undefined}
          onMoveDown={index >= 0 && !isLast ? () => move(1) : undefined}
          onEditRest={() => {
            if (!saveInFlight.current && !dragInFlight.current) {
              Keyboard.dismiss();
              setRestTarget(item.id);
            }
          }}
          onChange={(changes) => {
            if (!saveInFlight.current) updateExercise(item.id, changes);
          }}
          onRemove={() => {
            if (!saveInFlight.current) removeExercise(item.id);
          }}
          drag={() => {
            if (!saveInFlight.current) drag();
          }}
          isActive={isActive}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior="padding"
      automaticOffset
    >
      <View className="gap-md px-lg pb-md pt-lg">
        <View className="flex-row items-center gap-md">
          <IconButton
            icon="arrow-left"
            label="Go back to routines"
            onPress={() => router.back()}
            disabled={isSaving || isDragging}
          />
          <View className="flex-1">
            <ScreenHeader
              title={isNewRoutine ? "New routine" : "Edit routine"}
              subtitle="Hold and drag exercises to reorder."
            />
          </View>

          <IconButton
            icon="check"
            label={isSaving ? "Saving routine" : "Save routine"}
            variant="accent"
            onPress={save}
            disabled={isSaving || isDragging}
            busy={isSaving}
          />
        </View>

        {generalError ? (
          <View className="rounded-sm border border-danger/40 bg-danger/10 p-md">
            <Text className="font-body text-caption text-danger">
              {generalError}
            </Text>
          </View>
        ) : null}

        <TextField
          label="Routine name"
          error={nameError}
          editable={!isSaving}
          onChangeText={(name) => {
            if (saveInFlight.current || dragInFlight.current) return;
            setName(name);
            if (name.trim()) setNameError(null);
          }}
          placeholder="e.g. Push Day"
          value={draft.name}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Set rest for all exercises"
          disabled={isSaving || isDragging}
          onPress={() => {
            Keyboard.dismiss();
            setRestTarget("all");
          }}
          className="min-h-12 flex-row items-center justify-between gap-md"
        >
          <Text className="font-body-semibold text-sm text-text-primary">
            Rest for all
          </Text>
          <View className="flex-row items-center gap-sm">
            <Text className="font-numeric text-body text-text-secondary">
              {uniformRest
                ? formatRestDuration(Number(draft.exercises[0].restSeconds))
                : draft.exercises.length
                  ? "Mixed"
                  : "Set"}
            </Text>
            <Icon
              name="chevron-down"
              size={12}
              className="text-text-secondary"
            />
          </View>
        </Pressable>
      </View>

      <View className="flex-1 px-lg pt-sm">
        <Section
          title={`Exercises (${draft.exercises.length})`}
          className="flex-1"
        >
          {draft.exercises.length > 0 ? (
            <DraggableFlatList
              key={listLayout.revision}
              contentOffset={{ x: 0, y: listLayout.offset }}
              onScrollOffsetChange={(offset) => {
                scrollOffset.current = offset;
              }}
              data={draft.exercises}
              onDragBegin={() => {
                Keyboard.dismiss();
                dragInFlight.current = true;
                setIsDragging(true);
              }}
              onDragEnd={({ data }) => {
                if (!saveInFlight.current) reorderExercises(data);
                dragInFlight.current = false;
                setIsDragging(false);
                // The library retains native cell transforms until onLayout fires.
                // Reordering equal-sized rows can skip that event on Fabric.
                // Recreate the list after drop, preserving its scroll position.
                const offset = scrollOffset.current;
                setListLayout((current) => ({
                  revision: current.revision + 1,
                  offset,
                }));
              }}
              renderPlaceholder={() => (
                <View
                  pointerEvents="none"
                  className="flex-1 rounded-md border border-dashed border-border bg-surface"
                />
              )}
              autoscrollThreshold={64}
              autoscrollSpeed={120}
              animationConfig={{ overshootClamping: true }}
              keyExtractor={(item) => item.id}
              renderItem={renderExerciseItem}
              showsVerticalScrollIndicator={false}
              containerStyle={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <View className="py-lg">
              <Text className="font-body text-body leading-6 text-text-secondary">
                This routine is empty. Add exercises to create a complete
                workout.
              </Text>
            </View>
          )}
        </Section>
      </View>

      <View className="p-lg">
        <Button
          variant="outline"
          icon="plus"
          label="Add exercise"
          disabled={isSaving || isDragging}
          onPress={handleOpenExercisePicker}
        />
      </View>
      {restTarget !== null && (
        <RestDurationModal
          initialSeconds={Number(
            (restTarget === "all"
              ? draft.exercises[0]
              : draft.exercises.find((exercise) => exercise.id === restTarget)
            )?.restSeconds ?? "90",
          )}
          all={restTarget === "all"}
          onClose={() => setRestTarget(null)}
          onApply={(seconds) => {
            if (saveInFlight.current || dragInFlight.current) return;
            if (restTarget === "all") setRestForAll(seconds);
            else updateExercise(restTarget, { restSeconds: String(seconds) });
            setRestTarget(null);
          }}
        />
      )}
      <ConfirmModal
        visible={pendingExit !== null}
        title="Discard changes?"
        description="Your changes to this routine have not been saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        isDestructive
        onConfirm={() => {
          const resume = pendingExit;
          setPendingExit(null);
          setLeaving(true);
          resume?.();
        }}
        onCancel={() => setPendingExit(null)}
      />
    </KeyboardAvoidingView>
  );
}
