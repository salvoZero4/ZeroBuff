import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/utils/api/errors";
import {
  createWeight,
  updateWeight,
  type WeightLogRead,
} from "@/utils/api/weight";

type WeightLogModalProps = {
  visible: boolean;
  existingLog?: WeightLogRead | null;
  onClose: () => void;
};

export function WeightLogModal({
  visible,
  existingLog,
  onClose,
}: WeightLogModalProps) {
  const [weightInput, setWeightInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (visible) {
      const reset = setTimeout(() => {
        setWeightInput(existingLog ? String(existingLog.weight) : "");
        setError(null);
      }, 0);
      return () => clearTimeout(reset);
    }
  }, [visible, existingLog]);

  const { mutate: saveWeight, isPending } = useMutation({
    mutationFn: async (value: number) => {
      if (existingLog) {
        return await updateWeight(existingLog.id, { weight: value });
      }
      return await createWeight({ weight: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodyWeight"] });
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || "Invalid weight value.");
      } else {
        setError("Network error. Please try again.");
      }
    },
  });

  function handleSubmit() {
    const normalized = weightInput.replace(",", ".").trim();
    const parsed = Number.parseFloat(normalized);

    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
      setError("Enter a valid weight between 1 and 500 kg.");
      return;
    }

    saveWeight(parsed);
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ justifyContent: "flex-end", flexGrow: 1 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close weight modal"
          className="absolute inset-0"
          onPress={onClose}
        />

        <View
          onStartShouldSetResponder={() => true}
          className="gap-lg rounded-t-lg border border-border bg-surface p-xl"
        >
          <View className="flex-row items-center justify-between">
            <View className="gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                {existingLog ? "Update today's weight" : "Log body weight"}
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Track your daily weight in kilograms
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

          <TextField
            label="Weight (kg)"
            placeholder="es. 78.5"
            keyboardType="decimal-pad"
            value={weightInput}
            onChangeText={(val) => {
              setWeightInput(val);
              setError(null);
            }}
            error={error}
            editable={!isPending}
          />

          <Button
            label={
              isPending
                ? "Saving..."
                : existingLog
                  ? "Update weight"
                  : "Save weight"
            }
            onPress={handleSubmit}
            disabled={isPending}
          />
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
}
