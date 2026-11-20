import { tokenStore } from "@/features/auth/store/tokenStore";
import { confirmRoutineForOffline } from "@/features/workout/storage/workoutCache";
import { getWorkoutRoutine, savedRoutineKey } from "@/features/workout/storage/useCachedWorkoutData";
import { useExerciseNames } from "@/features/exercises/api/useExerciseNames";
import { errorText } from "@/shared/i18n/errors";
import { useTranslation } from "react-i18next";
import { routineKeys } from "@/features/routines/api/queryKeys";
import { router, usePreventRemove } from "expo-router";
import { useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Keyboard,
  Pressable,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoutineDraft } from "@/features/routines/hooks/useRoutineDraft";
import {
  createRoutine,
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
import { RoutineExerciseSettingsModal } from "@/features/routines/components/RoutineExerciseSettingsModal";
import { formatRestDuration } from "@/features/routines/utils/restDuration";
import { Icon } from "@/components/ui/Icon";
import { ExerciseEditor } from "@/features/routines/components/ExerciseEditor";
import { RoutineExerciseList } from "@/features/routines/components/RoutineExerciseList";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Section } from "@/components/ui/Section";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export function RoutineDetailScreen({
  routineId,
  offerWorkoutAfterSave,
}: {
  routineId: string;
  offerWorkoutAfterSave: boolean;
}) {
  const { t } = useTranslation();
  const isNewRoutine = routineId === "new";

  const {
    data: routine,
    isLoading,
    isError,
  } = useQuery({
    queryKey: routineKeys.detail(routineId),
    queryFn: () => getWorkoutRoutine(routineId),
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
          {t("Routine not found")}
        </Text>
        <Button
          variant="outline"
          label={t("Go back")}
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
      offerWorkoutAfterSave={isNewRoutine && offerWorkoutAfterSave}
    />
  );
}

function RoutineEditorForm({
  routineId,
  isNewRoutine,
  initialRoutine,
  offerWorkoutAfterSave,
}: {
  routineId: string;
  isNewRoutine: boolean;
  initialRoutine?: RoutineRead;
  offerWorkoutAfterSave: boolean;
}) {
  const { t } = useTranslation();
  const exerciseName = useExerciseNames();
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

  const [settingsTarget, setSettingsTarget] = useState<
    { kind: "all" } | { kind: "exercise"; id: string } | null
  >(null);
  const editingIndex = settingsTarget?.kind === "exercise"
    ? draft.exercises.findIndex(({ id }) => id === settingsTarget.id)
    : -1;
  const editingExercise = draft.exercises[editingIndex];
  const uniformRest =
    draft.exercises.length > 0 &&
    draft.exercises.every(
      (exercise) => exercise.restSeconds === draft.exercises[0].restSeconds,
    );
  const [baseline] = useState(() => routineDraftSignature(draft));
  const [leaving, setLeaving] = useState(false);
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null);
  const [savedRoutine, setSavedRoutine] = useState<RoutineRead | null>(null);
  const saveInFlight = useRef(false);
  const dragInFlight = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasChanges = routineDraftSignature(draft) !== baseline;

  const [nameError, setNameError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { mutate: handleSave, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const payload = toRoutinePayload(draft);
      const account = tokenStore.getAccountId();
      const scope = tokenStore.getSessionScope();
      const saved = await (isNewRoutine ? createRoutine(payload) : updateRoutine(routineId, payload));
      if (scope !== tokenStore.getSessionScope()) throw new Error("Account changed.");
      await confirmRoutineForOffline(account, saved);
      return saved;
    },
    onSuccess: async (saved) => {
      await queryClient.cancelQueries({ queryKey: routineKeys.detail(saved.id) });
      await queryClient.cancelQueries({ queryKey: savedRoutineKey(tokenStore.getAccountId(), saved.id) });
      queryClient.setQueryData(routineKeys.detail(saved.id), saved);
      queryClient.setQueryData(savedRoutineKey(tokenStore.getAccountId(), saved.id), saved);
      setLeaving(true);
      disableExitProtection();
      queryClient.invalidateQueries({ queryKey: routineKeys.all });
      if (offerWorkoutAfterSave) {
        Keyboard.dismiss();
        setSavedRoutine(saved);
      } else {
        router.back();
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setGeneralError(errorText(err, "Failed to save routine."));
      } else {
        setGeneralError(t("Network error. Please try again."));
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
      setNameError(t("Add a name before saving this routine."));
      return;
    }
    if (draft.exercises.length === 0) {
      setGeneralError(t("Add at least one exercise to your routine."));
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

  function closeSettings() {
    Keyboard.dismiss();
    setSettingsTarget(null);
  }

  function moveEditedExercise(direction: -1 | 1) {
    if (!editingExercise || saveInFlight.current || dragInFlight.current) return;
    moveExercise(editingExercise.id, direction);
    closeSettings();
    AccessibilityInfo.announceForAccessibility(
      t("{{name}} moved to position {{position}} of {{total}}.", {
        name: exerciseName(editingExercise.exercise_id, editingExercise.name),
        position: editingIndex + direction + 1,
        total: draft.exercises.length,
      }),
    );
  }

  function renderExerciseItem(item: RoutineExerciseDraft, grip: ReactNode, isActive: boolean) {
    return (
      <ExerciseEditor
        disabled={isSaving || (isDragging && !isActive)}
        isLast={draft.exercises.at(-1)?.id === item.id}
        exercise={item}
        displayName={exerciseName(item.exercise_id, item.name)}
        onEdit={() => {
          if (saveInFlight.current || dragInFlight.current) return;
          Keyboard.dismiss();
          setSettingsTarget({ kind: "exercise", id: item.id });
        }}
        grip={grip}
        isActive={isActive}
      />
    );
  }

  if (savedRoutine) {
    return (
      <View className="flex-1 gap-lg bg-bg p-lg">
        <ScreenHeader title={t("Routine saved")} subtitle={savedRoutine.name} />
        <Button
          variant="primary"
          label={t("Start workout")}
          onPress={() => {
            router.back();
            router.push({
              pathname: "/workout/[routineId]",
              params: { routineId: savedRoutine.id },
            });
          }}
        />
        <Button
          variant="ghost"
          label={t("Back to Today")}
          onPress={() => router.back()}
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
            label={t("Go back to routines")}
            onPress={() => router.back()}
            disabled={isSaving || isDragging}
          />
          <View className="flex-1">
            <ScreenHeader
              title={isNewRoutine ? t("New routine") : t("Edit routine")}
              subtitle={t("Drag the handles to reorder exercises.")}
            />
          </View>

          <IconButton
            icon="check"
            label={isSaving ? t("Saving routine") : t("Save routine")}
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
          label={t("Routine name")}
          error={nameError}
          editable={!isSaving}
          onChangeText={(name) => {
            if (saveInFlight.current || dragInFlight.current) return;
            setName(name);
            if (name.trim()) setNameError(null);
          }}
          placeholder={t("e.g. Push Day")}
          value={draft.name}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Set rest for all exercises")}
          disabled={isSaving || isDragging}
          onPress={() => {
            Keyboard.dismiss();
            setSettingsTarget({ kind: "all" });
          }}
          className="min-h-12 flex-row items-center justify-between gap-md"
        >
          <Text className="font-body-semibold text-sm text-text-primary">
            {t("Rest for all")}
          </Text>
          <View className="flex-row items-center gap-sm">
            <Text className="font-numeric text-body text-text-secondary">
              {uniformRest
                ? formatRestDuration(Number(draft.exercises[0].restSeconds))
                : draft.exercises.length
                  ? t("Mixed")
                  : t("Set")}
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
          title={t("Exercises ({{total}})", { total: draft.exercises.length })}
          className="flex-1"
        >
          {draft.exercises.length > 0 ? (
            <RoutineExerciseList
              exercises={draft.exercises}
              disabled={isSaving}
              onDragStart={() => {
                Keyboard.dismiss();
                dragInFlight.current = true;
                setIsDragging(true);
              }}
              onDrop={(from, to) => {
                if (!saveInFlight.current && from !== to) {
                  const exercises = [...draft.exercises];
                  const [exercise] = exercises.splice(from, 1);
                  exercises.splice(to, 0, exercise);
                  reorderExercises(exercises);
                }
                dragInFlight.current = false;
                setIsDragging(false);
              }}
              renderRow={renderExerciseItem}
            />
          ) : (
            <View className="py-lg">
              <Text className="font-body text-body leading-6 text-text-secondary">
                {t(
                  "This routine is empty. Add exercises to create a complete workout.",
                )}
              </Text>
            </View>
          )}
        </Section>
      </View>

      <View className="p-lg">
        <Button
          variant="outline"
          icon="plus"
          label={t("Add exercise")}
          disabled={isSaving || isDragging}
          onPress={handleOpenExercisePicker}
        />
      </View>
      {settingsTarget?.kind === "all" ? (
        <RoutineExerciseSettingsModal
          key="all"
          kind="all"
          initialSeconds={Number(draft.exercises[0]?.restSeconds ?? "90")}
          onClose={closeSettings}
          onApply={(seconds) => {
            if (saveInFlight.current || dragInFlight.current) return;
            setRestForAll(seconds);
            closeSettings();
          }}
        />
      ) : editingExercise ? (
        <RoutineExerciseSettingsModal
          key={editingExercise.id}
          kind="exercise"
          exercise={editingExercise}
          displayName={exerciseName(editingExercise.exercise_id, editingExercise.name)}
          onClose={closeSettings}
          onApply={(settings) => {
            if (saveInFlight.current || dragInFlight.current) return;
            updateExercise(editingExercise.id, settings);
            closeSettings();
          }}
          onMoveUp={editingIndex > 0 ? () => moveEditedExercise(-1) : undefined}
          onMoveDown={editingIndex < draft.exercises.length - 1 ? () => moveEditedExercise(1) : undefined}
          onRemove={() => {
            if (saveInFlight.current || dragInFlight.current) return;
            removeExercise(editingExercise.id);
            closeSettings();
          }}
        />
      ) : null}
      <ConfirmModal
        visible={pendingExit !== null}
        title={t("Discard changes?")}
        description={t("Your changes to this routine have not been saved.")}
        confirmLabel={t("Discard changes")}
        cancelLabel={t("Keep editing")}
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
