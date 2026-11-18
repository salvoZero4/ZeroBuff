import { errorText } from "@/shared/i18n/errors";
import { useTranslation } from "react-i18next";
import { weightKeys } from "@/features/weight/api/queryKeys";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { parseWeight } from "@/features/analytics/utils/progress";
import { createWeight, updateWeight } from "@/features/weight/api/weight";
import type { WeightLogRead } from "@/features/weight/types/weight";

type WeightLogModalProps = {
  date: string;
  existingLog?: WeightLogRead | null;
  onClose: () => void;
};

export function WeightLogModal({
  date,
  existingLog,
  onClose,
}: WeightLogModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [weightInput, setWeightInput] = useState(() =>
    existingLog ? String(existingLog.weight) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { mutate: saveWeight, isPending } = useMutation({
    mutationFn: async (value: string) => {
      const payload = parseWeight(value, date);
      if (existingLog) {
        return await updateWeight(existingLog.id, { weight: payload.weight });
      }
      return await createWeight(payload);
    },
    onSuccess: async (saved) => {
      const queryKey = weightKeys.today(saved.date);
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.setQueryData(queryKey, saved);
      queryClient.invalidateQueries({ queryKey: weightKeys.all });
      onClose();
    },
    onError: (err) => {
      setError(
        errorText(err, "Could not save your changes. Please try again."),
      );
    },
  });

  function handleSubmit() {
    if (isPending) return;
    setError(null);
    saveWeight(weightInput);
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible
      onRequestClose={() => {
        if (!isPending) onClose();
      }}
    >
      <KeyboardAwareScrollView
        bottomOffset={20}
        className="bg-black/75"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ justifyContent: "flex-end", flexGrow: 1 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Close weight modal")}
          className="absolute inset-0"
          disabled={isPending}
          onPress={onClose}
        />

        <View
          accessibilityViewIsModal
          onStartShouldSetResponder={() => true}
          className="gap-lg rounded-t-lg border-t border-border bg-bg p-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center gap-md">
            <View className="flex-1 gap-xs">
              <Text
                accessibilityRole="header"
                className="font-body-bold text-xl text-text-primary"
              >
                {existingLog
                  ? t("Update today's weight")
                  : t("Log body weight")}
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                {t("Track your daily weight in kilograms")}
              </Text>
            </View>
            <IconButton
              icon="xmark"
              label={t("Close")}
              variant="bare"
              disabled={isPending}
              onPress={onClose}
            />
          </View>

          <TextField
            label={t("Weight (kg)")}
            placeholder={t("e.g. 78.5")}
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
                ? t("Saving...")
                : existingLog
                  ? t("Update weight")
                  : t("Save weight")
            }
            onPress={handleSubmit}
            disabled={isPending}
          />
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
}
