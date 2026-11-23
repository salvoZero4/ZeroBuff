import { errorText } from "@/shared/i18n/errors";
import { useTranslation } from "react-i18next";
import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import { useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/shared/api/errors";
import { routineKeys } from "@/features/routines/api/queryKeys";
import { scheduleKeys } from "@/features/schedule/api/queryKeys";
import { sessionKeys } from "@/features/workout/api/queryKeys";
import {
  createExercise,
  getExerciseNameMatches,
  updateExercise,
} from "@/features/exercises/api/exercise";
import { useExerciseNames } from "@/features/exercises/api/useExerciseNames";
import { ExerciseListRow } from "./ExerciseListRow";
import {
  EQUIPMENT_LIST,
  MUSCLE_GROUPS,
  type Equipment,
  type ExerciseCreated,
  type ExerciseRead,
  type MuscleGroup,
} from "@/features/exercises/types/exercise";
import {
  SelectPickerModal,
  type PickerOption,
} from "@/components/ui/SelectPickerModal";

type ActivePicker = "primary_muscle" | "secondary_muscles" | "equipment" | null;

type CreateExerciseModalProps = {
  visible: boolean;
  initialName?: string;
  onClose: () => void;
  onSelect: (exercise: ExerciseRead) => void;
};

export function CreateExerciseModal({
  onSelect,
  ...props
}: CreateExerciseModalProps) {
  return (
    <ExerciseFormModal {...props} onSaved={onSelect} onUseExisting={onSelect} />
  );
}

export function ExerciseFormModal({
  visible,
  initialName = "",
  onClose,
  onSaved,
  onUseExisting,
  exercise,
  onUnavailable,
}: Omit<CreateExerciseModalProps, "onSelect"> & {
  onSaved?: (exercise: ExerciseRead) => void;
  onUseExisting?: (exercise: ExerciseRead) => void;
  exercise?: ExerciseRead;
  onUnavailable?: () => void;
}) {
  const { t } = useTranslation();
  const exerciseName = useExerciseNames();
  const MUSCLE_OPTIONS: PickerOption[] = MUSCLE_GROUPS.map((mg) => ({
    value: mg,
    label: t(`exercise.${mg}`),
  }));

  const EQUIPMENT_OPTIONS: PickerOption[] = EQUIPMENT_LIST.map((eq) => ({
    value: eq,
    label: t(`exercise.${eq}`),
  }));

  const insets = useSafeAreaInsets();
  const [name, setName] = useState(exercise?.name ?? initialName);
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>(
    exercise?.muscle_group ?? "chest",
  );
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>(
    exercise?.secondary_muscle_groups ?? [],
  );
  const [equipment, setEquipment] = useState<Equipment>(
    exercise?.equipment ?? "barbell",
  );

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [matches, setMatches] = useState<ExerciseRead[]>([]);

  const queryClient = useQueryClient();

  const submitting = useRef(false);
  const { mutate: save, isPending } = useMutation({
    mutationFn: (payload: ExerciseCreated) =>
      exercise ? updateExercise(exercise.id, payload) : createExercise(payload),
    onSuccess: async (savedExercise) => {
      if (exercise) {
        const detailKey = exerciseKeys.detail(exercise.id);
        await queryClient.cancelQueries({ queryKey: detailKey });
        queryClient.setQueryData(detailKey, savedExercise);
        void queryClient.invalidateQueries({ queryKey: routineKeys.all });
        void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
        void queryClient.invalidateQueries({
          queryKey: sessionKeys.loggedExercises(),
        });
        void queryClient.invalidateQueries({ queryKey: sessionKeys.details() });
      } else {
        setName("");
        setSecondaryMuscles([]);
      }
      void queryClient.invalidateQueries({
        queryKey: exerciseKeys.infiniteLists(),
      });
      setErrorMessage(null);
      onSaved?.(savedExercise);
      onClose();
    },
    onError: (err) => {
      if (exercise && err instanceof ApiError && err.status === 404) {
        onUnavailable?.();
        return;
      }
      const existing = getExerciseNameMatches(err);
      if (existing.length) {
        Keyboard.dismiss();
        setMatches(existing);
        setErrorMessage(t("An exercise with a similar name already exists."));
        return;
      }
      setErrorMessage(
        errorText(
          err,
          exercise
            ? "Failed to update exercise."
            : err instanceof ApiError && err.status === 409
              ? "An exercise with a similar name already exists."
              : "Failed to create exercise.",
        ),
      );
    },
    onSettled: () => {
      submitting.current = false;
    },
  });

  function handleSubmit() {
    if (submitting.current || matches.length) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage(t("Enter an exercise name."));
      return;
    }

    const length = Array.from(trimmed).length;
    if (exercise && (length < 3 || length > 100)) {
      setErrorMessage(t("Exercise names must be 3 to 100 characters."));
      return;
    }

    setErrorMessage(null);
    submitting.current = true;
    save({
      name: trimmed,
      muscle_group: primaryMuscle,
      equipment,
      secondary_muscle_groups: secondaryMuscles,
    });
  }

  function handleClose() {
    if (!submitting.current) onClose();
  }

  function selectExisting(existing: ExerciseRead) {
    if (submitting.current || !onUseExisting) return;
    submitting.current = true;
    onClose();
    onUseExisting(existing);
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        className="flex-1 justify-end bg-black/75"
      >
        <Pressable
          accessibilityLabel={t("Close modal")}
          accessibilityRole="button"
          className="absolute inset-0"
          disabled={isPending}
          onPress={handleClose}
        />

        <View
          accessibilityViewIsModal
          onStartShouldSetResponder={() => true}
          className="max-h-[95%] gap-lg rounded-t-lg border-t border-border bg-bg p-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center gap-md">
            <View className="flex-1 gap-xs">
              <Text
                accessibilityRole="header"
                className="font-body-bold text-xl text-text-primary"
              >
                {t(exercise ? "Edit exercise" : "New custom exercise")}
              </Text>
              {exercise ? null : (
                <Text className="font-body text-caption text-text-secondary">
                  {t("Will be added to the shared catalog")}
                </Text>
              )}
            </View>
            <IconButton
              icon="xmark"
              label={t("Close")}
              variant="bare"
              disabled={isPending}
              onPress={handleClose}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-lg pb-md"
          >
            <TextField
              label={t("Exercise name")}
              placeholder={t("e.g. Incline Smith Machine Press")}
              value={name}
              onChangeText={(val) => {
                setName(val);
                setErrorMessage(null);
                setMatches([]);
              }}
              error={errorMessage}
              editable={!isPending}
            />

            {matches.length > 0 && (
              <View className="gap-xs">
                <Text
                  accessibilityLiveRegion="polite"
                  className="font-body-semibold text-caption text-text-primary"
                >
                  {t(
                    onUseExisting
                      ? "Use an existing exercise"
                      : "Choose a different name",
                  )}
                </Text>
                {matches.map((existing, index) => {
                  const name = exerciseName(existing.id, existing.name);
                  return onUseExisting ? (
                    <ExerciseListRow
                      key={existing.id}
                      action="reuse"
                      name={name}
                      detail={`${t(`exercise.${existing.muscle_group}`)} · ${t(`exercise.${existing.equipment}`)}`}
                      isLast={index === matches.length - 1}
                      onPress={() => selectExisting(existing)}
                    />
                  ) : (
                    <Text
                      key={existing.id}
                      className="font-body text-body text-text-secondary"
                    >
                      {name}
                    </Text>
                  );
                })}
              </View>
            )}

            <View className="gap-xs">
              <Text className="font-body-semibold text-caption text-text-primary">
                {t("Primary muscle group")}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isPending}
                onPress={() => setActivePicker("primary_muscle")}
                className="min-h-14 flex-row items-center justify-between rounded-sm border border-border bg-surface-raised px-lg active:bg-surface"
              >
                <Text className="font-body-medium text-body text-text-primary">
                  {t(`exercise.${primaryMuscle}`)}
                </Text>
                <Icon
                  name="chevron-down"
                  size={14}
                  className="text-text-secondary"
                />
              </Pressable>
            </View>

            <View className="gap-xs">
              <Text className="font-body-semibold text-caption text-text-primary">
                {t("Secondary muscle groups (optional)")}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isPending}
                onPress={() => setActivePicker("secondary_muscles")}
                className="min-h-14 flex-row items-center justify-between rounded-sm border border-border bg-surface-raised px-lg active:bg-surface"
              >
                <Text
                  numberOfLines={1}
                  className={`font-body-medium text-body max-w-[80%] ${
                    secondaryMuscles.length > 0
                      ? "text-text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {secondaryMuscles.length > 0
                    ? secondaryMuscles
                        .map((muscle) => t(`exercise.${muscle}`))
                        .join(", ")
                    : t("None selected")}
                </Text>
                <Icon
                  name="chevron-down"
                  size={14}
                  className="text-text-secondary"
                />
              </Pressable>
            </View>

            <View className="gap-xs">
              <Text className="font-body-semibold text-caption text-text-primary">
                {t("Equipment")}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isPending}
                onPress={() => setActivePicker("equipment")}
                className="min-h-14 flex-row items-center justify-between rounded-sm border border-border bg-surface-raised px-lg active:bg-surface"
              >
                <Text className="font-body-medium text-body text-text-primary">
                  {t(`exercise.${equipment}`)}
                </Text>
                <Icon
                  name="chevron-down"
                  size={14}
                  className="text-text-secondary"
                />
              </Pressable>
            </View>

            <Button
              label={
                isPending
                  ? t("Saving...")
                  : t(exercise ? "Save changes" : "Create exercise")
              }
              onPress={handleSubmit}
              disabled={isPending || matches.length > 0}
            />
          </ScrollView>
        </View>

        <SelectPickerModal
          visible={activePicker === "primary_muscle"}
          title={t("Primary muscle")}
          options={MUSCLE_OPTIONS}
          selectedValues={[primaryMuscle]}
          multiSelect={false}
          onConfirm={(vals) => {
            const next = vals[0] as MuscleGroup;
            setPrimaryMuscle(next);
            if (exercise) {
              setSecondaryMuscles((previous) =>
                previous.filter((muscle) => muscle !== next),
              );
            }
          }}
          onClose={() => setActivePicker(null)}
        />

        <SelectPickerModal
          visible={activePicker === "secondary_muscles"}
          title={t("Secondary muscles")}
          options={MUSCLE_OPTIONS.filter((opt) => opt.value !== primaryMuscle)}
          selectedValues={secondaryMuscles}
          multiSelect={true}
          onConfirm={(vals) => setSecondaryMuscles(vals as MuscleGroup[])}
          onClose={() => setActivePicker(null)}
        />

        <SelectPickerModal
          visible={activePicker === "equipment"}
          title={t("Equipment")}
          options={EQUIPMENT_OPTIONS}
          selectedValues={[equipment]}
          multiSelect={false}
          onConfirm={(vals) => setEquipment(vals[0] as Equipment)}
          onClose={() => setActivePicker(null)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
