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

type CreateExerciseModalProps = {
  visible: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated: (exercise: ExerciseRead) => void;
};

export function CreateExerciseModal({
  visible,
  initialName = "",
  onClose,
  onCreated,
}: CreateExerciseModalProps) {
  const [name, setName] = useState(initialName);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>("chest");
  const [selectedEquipment, setSelectedEquipment] =
    useState<Equipment>("barbell");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { mutate: handleCreate, isPending } = useMutation({
    mutationFn: (payload: ExerciseCreated) => createExercise(payload),
    onSuccess: (newExercise) => {
      // Invalida la cache degli esercizi per aggiornare la lista paginata
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setName("");
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
      muscle_group: selectedMuscle,
      equipment: selectedEquipment,
      secondary_muscle_groups: [],
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
        className="flex-1 justify-end bg-black/75"
      >
        {/* Backdrop per chiusura */}
        <Pressable
          accessibilityLabel="Close modal"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onClose}
        />

        {/* Sheet card */}
        <View
          onStartShouldSetResponder={() => true}
          className="max-h-[85%] gap-lg rounded-t-lg border border-border bg-surface p-xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="gap-xs">
              <Text className="font-body-bold text-title text-text-primary">
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
              <Icon
                name="arrow-left"
                size={14}
                className="text-text-secondary"
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-lg"
          >
            {/* Input Nome */}
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

            {/* Selezione Muscle Group */}
            <View className="gap-xs">
              <Text className="font-body-semibold text-caption text-text-primary">
                Target muscle
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-xs"
              >
                {MUSCLE_GROUPS.map((muscle) => {
                  const isSelected = selectedMuscle === muscle;
                  return (
                    <Pressable
                      key={muscle}
                      accessibilityRole="button"
                      onPress={() => setSelectedMuscle(muscle)}
                      className={`rounded-sm border px-md py-xs capitalize ${
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border bg-surface-raised"
                      }`}
                    >
                      <Text
                        className={`font-body-semibold text-caption ${
                          isSelected ? "text-on-accent" : "text-text-secondary"
                        }`}
                      >
                        {muscle.replace(/_/g, " ")}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Selezione Equipment */}
            <View className="gap-xs">
              <Text className="font-body-semibold text-caption text-text-primary">
                Equipment
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-xs"
              >
                {EQUIPMENT_LIST.map((equipment) => {
                  const isSelected = selectedEquipment === equipment;
                  return (
                    <Pressable
                      key={equipment}
                      accessibilityRole="button"
                      onPress={() => setSelectedEquipment(equipment)}
                      className={`rounded-sm border px-md py-xs capitalize ${
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border bg-surface-raised"
                      }`}
                    >
                      <Text
                        className={`font-body-semibold text-caption ${
                          isSelected ? "text-on-accent" : "text-text-secondary"
                        }`}
                      >
                        {equipment.replace(/_/g, " ")}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <Button
              label={isPending ? "Saving..." : "Create exercise"}
              onPress={handleSubmit}
              disabled={isPending}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
