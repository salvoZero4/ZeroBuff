import { useState } from "react";
import { Modal, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { TextField } from "@/components/ui/TextField";
import {
  createWeight,
  getTodayWeight,
  updateWeight,
} from "@/features/weight/api/weight";
import { weightKeys } from "@/features/weight/api/queryKeys";
import type { WeightLogRead } from "@/features/weight/types/weight";
import { WEIGHT_UNIT } from "@/features/workout/utils/experience";
import { toLocalDateString } from "@/shared/utils/dates";
import { ApiError } from "@/shared/api/errors";
import { dateLabel, parseWeight } from "../utils/progress";
export function WeightEntryEditor({
  existing,
  onClose,
}: {
  existing: WeightLogRead | null;
  onClose: () => void;
}) {
  const [log, setLog] = useState(existing);
  const [value, setValue] = useState(existing ? String(existing.weight) : "");
  const [date, setDate] = useState(existing?.date ?? toLocalDateString());
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const client = useQueryClient(),
    insets = useSafeAreaInsets();
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = parseWeight(value, date);
      return log
        ? updateWeight(log.id, { weight: payload.weight })
        : createWeight(payload);
    },
    onSuccess: () => {
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      if (err instanceof ApiError && err.status === 409) setConflict(true);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: weightKeys.all });
    },
  });
  const loadConflict = useMutation({
    mutationFn: () => getTodayWeight(date),
    onSuccess: (record) => {
      if (record) {
        setLog(record);
        setValue(String(record.weight));
        setConflict(false);
        setError(null);
      } else {
        setConflict(false);
        setError("The entry no longer exists. Try saving again.");
      }
    },
    onError: (err: Error) => setError(err.message),
  });
  const busy = mutation.isPending || loadConflict.isPending;
  return (
    <Modal
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
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
            {log ? "Edit body weight" : "Log body weight"}
          </Text>
          {log ? (
            <Text className="font-body text-body text-text-secondary">
              {dateLabel(log.date)}
            </Text>
          ) : (
            <DateField
              value={date}
              maxDate={toLocalDateString()}
              disabled={busy}
              onChange={(next) => {
                setDate(next);
                setConflict(false);
                setError(null);
              }}
            />
          )}
          <TextField
            label={`Body weight (${WEIGHT_UNIT})`}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            editable={!busy}
          />
          {error && (
            <Text
              accessibilityRole="alert"
              className="font-body text-body text-danger"
            >
              {error}
            </Text>
          )}
          {conflict ? (
            <Button
              label={busy ? "Loading…" : "Edit existing entry for this date"}
              disabled={busy}
              onPress={() => loadConflict.mutate()}
            />
          ) : (
            <Button
              label={busy ? "Saving…" : "Save weight"}
              disabled={busy}
              onPress={() => {
                setError(null);
                mutation.mutate();
              }}
            />
          )}
          <Button
            label="Cancel"
            variant="outline"
            disabled={busy}
            onPress={onClose}
          />
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
}
