import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { formatRestDuration, parseRestDuration } from "../utils/restDuration";
import {
  parseExerciseTarget,
  type RoutineExerciseDraft,
} from "../utils/routineDraft";

type ExerciseSettings = Pick<
  RoutineExerciseDraft,
  "sets" | "reps" | "restSeconds"
>;

type RoutineExerciseSettingsModalProps = {
  onClose: () => void;
} & (
  | {
      kind: "all";
      initialSeconds: number;
      onApply: (seconds: number) => void;
    }
  | {
      kind: "exercise";
      exercise: RoutineExerciseDraft;
      displayName: string;
      onApply: (settings: ExerciseSettings) => void;
      onMoveUp?: () => void;
      onMoveDown?: () => void;
      onRemove: () => void;
    }
);

export function RoutineExerciseSettingsModal(
  props: RoutineExerciseSettingsModalProps,
) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const exercise = props.kind === "exercise" ? props.exercise : null;
  const initialSeconds =
    props.kind === "exercise"
      ? Number(props.exercise.restSeconds)
      : props.initialSeconds;
  const [sets, setSets] = useState(exercise?.sets ?? "");
  const [reps, setReps] = useState(exercise?.reps ?? "");
  const [minutes, setMinutes] = useState(
    String(Math.floor(initialSeconds / 60)),
  );
  const [seconds, setSeconds] = useState(String(initialSeconds % 60));
  const [validateTargets, setValidateTargets] = useState(false);
  const [restError, setRestError] = useState<string | null>(null);
  const validSets = parseExerciseTarget(sets);
  const validReps = parseExerciseTarget(reps);
  const targetError = t("Enter a whole number greater than zero.");

  function apply() {
    setValidateTargets(true);
    let duration: number;
    try {
      duration = parseRestDuration(minutes, seconds);
    } catch (error) {
      setRestError((error as Error).message);
      return;
    }
    if (props.kind === "all") {
      props.onApply(duration);
    } else if (validSets !== null && validReps !== null) {
      props.onApply({
        sets: String(validSets),
        reps: String(validReps),
        restSeconds: String(duration),
      });
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        className="flex-1 justify-end bg-black/75"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Close")}
          className="absolute inset-0"
          onPress={props.onClose}
        />
        <View
          accessibilityViewIsModal
          className="max-h-[90%] shrink rounded-t-lg border-t border-border bg-bg"
        >
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-md p-lg"
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <View className="flex-row items-center gap-sm">
              <View className="flex-1 gap-xs">
                <Text
                  accessibilityRole="header"
                  className="font-body-bold text-xl text-text-primary"
                >
                  {props.kind === "all"
                    ? t("Rest for all exercises")
                    : props.displayName}
                </Text>
                {props.kind === "all" ? (
                  <Text className="font-body text-caption text-text-secondary">
                    {t(
                      "Replaces existing rest times. Individual changes are still available.",
                    )}
                  </Text>
                ) : null}
              </View>
              <IconButton
                icon="xmark"
                label={t("Close")}
                variant="bare"
                onPress={props.onClose}
              />
            </View>
            {props.kind === "exercise" ? (
              <>
                <View className="flex-row gap-md">
                  <View className="flex-1">
                    <TextField
                      label={t("Sets")}
                      keyboardType="number-pad"
                      value={sets}
                      onChangeText={setSets}
                      error={
                        validateTargets && validSets === null
                          ? targetError
                          : null
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <TextField
                      label={t("Reps")}
                      keyboardType="number-pad"
                      value={reps}
                      onChangeText={setReps}
                      error={
                        validateTargets && validReps === null
                          ? targetError
                          : null
                      }
                    />
                  </View>
                </View>
                <Text
                  accessibilityRole="header"
                  className="font-body-semibold text-body text-text-primary"
                >
                  {t("Rest duration")}
                </Text>
              </>
            ) : null}
            <View className="flex-row flex-wrap gap-sm">
              {[60, 90, 120, 180].map((value) => {
                const presetMinutes = Math.floor(value / 60);
                const presetSeconds = value % 60;
                const selected =
                  String(presetMinutes) === minutes &&
                  String(presetSeconds) === seconds;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      "{{minutes}} minutes {{seconds}} seconds rest",
                      {
                        minutes: presetMinutes,
                        seconds: presetSeconds,
                      },
                    )}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setMinutes(String(presetMinutes));
                      setSeconds(String(presetSeconds));
                      setRestError(null);
                    }}
                    className={`min-h-12 min-w-12 items-center justify-center rounded-sm px-md ${selected ? "bg-surface-raised" : "bg-surface"}`}
                  >
                    <Text className="font-numeric text-xl text-text-primary">
                      {formatRestDuration(value)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="flex-row gap-md">
              <View className="flex-1">
                <TextField
                  label={t("Minutes")}
                  value={minutes}
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    setMinutes(value);
                    setRestError(null);
                  }}
                />
              </View>
              <View className="flex-1">
                <TextField
                  label={t("Seconds")}
                  value={seconds}
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    setSeconds(value);
                    setRestError(null);
                  }}
                />
              </View>
            </View>
            {restError ? (
              <Text
                accessibilityRole="alert"
                className="font-body text-caption text-danger"
              >
                {t(restError)}
              </Text>
            ) : null}
            <Button
              label={props.kind === "all" ? t("Apply to all") : t("Apply")}
              onPress={apply}
            />
            {props.kind === "exercise" ? (
              <View className="gap-xs border-t border-border pt-sm">
                {props.onMoveUp || props.onMoveDown ? (
                  <View className="flex-row gap-sm">
                    <View className="flex-1">
                      <Button
                        variant="ghost"
                        icon="chevron-up"
                        label={t("Move up")}
                        disabled={!props.onMoveUp}
                        onPress={props.onMoveUp}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        variant="ghost"
                        icon="chevron-down"
                        label={t("Move down")}
                        disabled={!props.onMoveDown}
                        onPress={props.onMoveDown}
                      />
                    </View>
                  </View>
                ) : null}
                <Button
                  variant="danger"
                  icon="trash"
                  label={t("Remove exercise")}
                  onPress={props.onRemove}
                />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
