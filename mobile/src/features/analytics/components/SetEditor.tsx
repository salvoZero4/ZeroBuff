import { useState } from "react";
import { Modal, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { saveSessionSet } from "../api/analytics";
import { ApiError, NetworkError } from "@/shared/api/errors";
import type { SetLogRead } from "@/features/workout/types/session";
import { WEIGHT_UNIT } from "@/features/workout/utils/experience";
import { useRefreshTraining } from "../hooks/useAnalytics";
export type SetEditorTarget = {
  exerciseId: string;
  name: string;
  number: number;
  set?: SetLogRead;
};
export function SetEditor({
  sessionId,
  target,
  sets,
  onClose,
}: {
  sessionId: string;
  target: SetEditorTarget;
  sets: SetLogRead[];
  onClose: () => void;
}) {
  const [weight, setWeight] = useState(
    target.set ? String(target.set.weight) : "",
  );
  const [reps, setReps] = useState(target.set ? String(target.set.reps) : "");
  const [rir, setRir] = useState(
    target.set?.rir == null ? "" : String(target.set.rir),
  );
  const [number, setNumber] = useState(String(target.number));
  const [error, setError] = useState<string | null>(null);
  const [needsReview, setNeedsReview] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const refresh = useRefreshTraining();
  const insets = useSafeAreaInsets();
  const save = useMutation({
    mutationFn: () =>
      saveSessionSet(
        sessionId,
        target.exerciseId,
        target.set?.id,
        { weight, reps, rir, set_number: number },
        sets,
      ),
    onSuccess: () => {
      onClose();
    },
    onError: (err: Error) => {
      setError(
        err instanceof NetworkError
          ? "Save could not be confirmed. Close and check the session before trying again."
          : err.message,
      );
      setNeedsReview(
        err instanceof NetworkError ||
          (err instanceof ApiError && err.status === 404),
      );
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors ?? {});
    },
    onSettled: () => {
      void refresh();
    },
  });
  return (
    <Modal
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!save.isPending) onClose();
      }}
    >
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
        className="bg-black/75"
      >
        <View
          className="gap-lg rounded-t-lg border border-border bg-surface p-xl"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <Text className="font-body-bold text-xl text-text-primary">
            {target.set ? "Edit set" : "Add set"}
          </Text>
          <Text className="font-body text-body text-text-secondary">
            {target.name}
          </Text>
          <View className="flex-row gap-md">
            <View className="flex-1">
              <TextField
                label="Set number"
                error={fieldErrors.set_number}
                value={number}
                onChangeText={setNumber}
                keyboardType="numeric"
                editable={!save.isPending}
              />
            </View>
            <View className="flex-1">
              <TextField
                label={`Load (${WEIGHT_UNIT})`}
                error={fieldErrors.weight}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                editable={!save.isPending}
              />
            </View>
          </View>
          <View className="flex-row gap-md">
            <View className="flex-1">
              <TextField
                label="Reps"
                error={fieldErrors.reps}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                editable={!save.isPending}
              />
            </View>
            <View className="flex-1">
              <TextField
                label="RIR (optional)"
                error={fieldErrors.rir}
                value={rir}
                onChangeText={setRir}
                keyboardType="numeric"
                editable={!save.isPending}
              />
            </View>
          </View>
          <Text className="font-body text-caption text-text-secondary">
            Use 0 load for bodyweight. Leave RIR empty if unknown.
          </Text>
          {error && (
            <Text
              accessibilityRole="alert"
              className="font-body text-body text-danger"
            >
              {error}
            </Text>
          )}
          <Button
            label={save.isPending ? "Saving…" : "Save set"}
            disabled={save.isPending || needsReview}
            onPress={() => {
              setError(null);
              save.mutate();
            }}
          />
          <Button
            label={needsReview ? "Close and review session" : "Cancel"}
            variant="outline"
            disabled={save.isPending}
            onPress={onClose}
          />
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
}
