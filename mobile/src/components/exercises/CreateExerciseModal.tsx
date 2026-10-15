import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/utils/api/errors";
import {
  createExercise,
  EQUIPMENT_LIST,
  MUSCLE_GROUPS,
  type Equipment,
  type ExerciseCreated,
  type ExerciseRead,
  type MuscleGroup,
} from "@/utils/api/exercise";
import {
  SelectPickerModal,
  type PickerOption,
} from "@/components/ui/SelectPickerModal";

type ActivePicker = "primary_muscle" | "secondary_muscles" | "equipment" | null;

type CreateExerciseModalProps = {
  visible: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated: (exercise: ExerciseRead) => void;
};

function formatLabel(val: string): string {
  return val
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const MUSCLE_OPTIONS: PickerOption[] = MUSCLE_GROUPS.map((mg) => ({
  value: mg,
  label: formatLabel(mg),
}));

const EQUIPMENT_OPTIONS: PickerOption[] = EQUIPMENT_LIST.map((eq) => ({
  value: eq,
  label: formatLabel(eq),
}));

export function CreateExerciseModal({
  visible,
  initialName = "",
  onClose,
  onCreated,
}: CreateExerciseModalProps) {
  const [name, setName] = useState(initialName);
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>("chest");
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment>("barbell");

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { mutate: handleCreate, isPending } = useMutation({
    mutationFn: (payload: ExerciseCreated) => createExercise(payload),
    onSuccess: (newExercise) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setName("");
      setSecondaryMuscles([]);
      setErrorMessage(null);
      onCreated(newExercise);
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Failed to create exercise.");
      } else {
        setErrorMessage("Network error. Please try again.");
      }
    },
  });

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage("Enter an exercise name.");
      return;
    }

    handleCreate({
      name: trimmed,
      muscle_group: primaryMuscle,
      equipment,
      secondary_muscle_groups: secondaryMuscles,
    });
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-bg/65"
      >
        <Pressable
          accessibilityLabel="Close modal"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onClose}
        />

        <View
          onStartShouldSetResponder={() => true}
          className="max-h-[95%] gap-lg rounded-t-lg border border-border bg-surface p-xl"
        >
          <View className="flex-row items-center justify-between">
            <View className="gap-xs">
              <Text className="font-body-bold text-body text-text-primary">
                New custom exercise
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Will be added to the shared catalog
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-surface-raised active:bg-surface"
            >
              <Icon name="xmark" size={14} className="text-text-secondary" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-lg pb-md"
          >
            <TextField
              label="Exercise name"
              placeholder="e.g. Incline Smith Machine Press"
              value={name}
              onChangeText={(val) => {
                setName(val);
                setErrorMessage(null);
              }}
              error={errorMessage}
              editable={!isPending}
            />

            <View className="gap-xs">
              <Text className="font-body-semibold text-caption text-text-primary">
                Primary muscle group
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setActivePicker("primary_muscle")}
                className="min-h-14 flex-row items-center justify-between rounded-sm border border-border bg-surface-raised px-lg active:bg-surface"
              >
                <Text className="font-body-medium text-body text-text-primary">
                  {formatLabel(primaryMuscle)}
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
                Secondary muscle groups (optional)
              </Text>
              <Pressable
                accessibilityRole="button"
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
                    ? secondaryMuscles.map(formatLabel).join(", ")
                    : "None selected"}
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
                Equipment
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setActivePicker("equipment")}
                className="min-h-14 flex-row items-center justify-between rounded-sm border border-border bg-surface-raised px-lg active:bg-surface"
              >
                <Text className="font-body-medium text-body text-text-primary">
                  {formatLabel(equipment)}
                </Text>
                <Icon
                  name="chevron-down"
                  size={14}
                  className="text-text-secondary"
                />
              </Pressable>
            </View>

            <Button
              label={isPending ? "Saving..." : "Create exercise"}
              onPress={handleSubmit}
              disabled={isPending}
            />
          </ScrollView>
        </View>

        <SelectPickerModal
          visible={activePicker === "primary_muscle"}
          title="Primary muscle"
          options={MUSCLE_OPTIONS}
          selectedValues={[primaryMuscle]}
          multiSelect={false}
          onConfirm={(vals) => setPrimaryMuscle(vals[0] as MuscleGroup)}
          onClose={() => setActivePicker(null)}
        />

        <SelectPickerModal
          visible={activePicker === "secondary_muscles"}
          title="Secondary muscles"
          options={MUSCLE_OPTIONS.filter((opt) => opt.value !== primaryMuscle)}
          selectedValues={secondaryMuscles}
          multiSelect={true}
          onConfirm={(vals) => setSecondaryMuscles(vals as MuscleGroup[])}
          onClose={() => setActivePicker(null)}
        />

        <SelectPickerModal
          visible={activePicker === "equipment"}
          title="Equipment"
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
