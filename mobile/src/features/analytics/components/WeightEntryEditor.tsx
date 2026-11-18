import { errorText } from "@/shared/i18n/errors";
import { useTranslation } from "react-i18next";
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
import { dateLabel } from "@/shared/i18n/i18n";
import { parseWeight } from "../utils/progress";
export function WeightEntryEditor({
  existing,
  onClose,
}: {
  existing: WeightLogRead | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
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
      setError(
        errorText(err, "Could not save your changes. Please try again."),
      );
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
        setError(t("The entry no longer exists. Try saving again."));
      }
    },
    onError: (err: Error) =>
      setError(
        errorText(err, "Could not save your changes. Please try again."),
      ),
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
          accessibilityViewIsModal
          className="gap-lg rounded-t-lg border-t border-border bg-bg p-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Text
            accessibilityRole="header"
            className="font-body-bold text-xl text-text-primary"
          >
            {log ? t("Edit body weight") : t("Log body weight")}
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
            label={t("Body weight ({{unit}})", { unit: WEIGHT_UNIT })}
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
              label={
                busy ? t("Loading…") : t("Edit existing entry for this date")
              }
              disabled={busy}
              onPress={() => loadConflict.mutate()}
            />
          ) : (
            <Button
              label={busy ? t("Saving…") : t("Save weight")}
              disabled={busy}
              onPress={() => {
                setError(null);
                mutation.mutate();
              }}
            />
          )}
          <Button
            label={t("Cancel")}
            variant="ghost"
            disabled={busy}
            onPress={onClose}
          />
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
}
