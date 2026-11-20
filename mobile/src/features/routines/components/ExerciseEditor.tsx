import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { type RoutineExerciseDraft } from "../utils/routineDraft";
import { formatRestDuration } from "../utils/restDuration";

type ExerciseEditorProps = {
  exercise: RoutineExerciseDraft;
  displayName: string;
  onEdit: () => void;
  grip: ReactNode;
  isActive: boolean;
  disabled?: boolean;
  isLast: boolean;
};

export function ExerciseEditor({
  exercise,
  displayName,
  onEdit,
  grip,
  isActive,
  disabled = false,
  isLast,
}: ExerciseEditorProps) {
  const { t } = useTranslation();
  const summary = t("{{sets}} sets · {{reps}} reps · {{rest}} rest", {
    sets: exercise.sets,
    reps: exercise.reps,
    rest: formatRestDuration(Number(exercise.restSeconds)),
  });

  return (
    <View
      className={`relative flex-row items-center py-xs ${isLast ? "" : "border-b border-border"} ${isActive ? "rounded-md bg-surface-raised" : "bg-bg"}`}
    >
      {isActive ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 rounded-md border border-text-secondary"
        />
      ) : null}
      {grip}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Edit {{name}}", { name: displayName })}
        accessibilityHint={summary}
        disabled={disabled || isActive}
        onPress={onEdit}
        className="min-h-12 flex-1 flex-row items-center gap-sm rounded-sm px-sm active:bg-surface"
      >
        <View className="flex-1">
          <Text className="font-body-semibold text-body text-text-primary">
            {displayName}
          </Text>
          <Text className="font-body text-caption text-text-secondary">
            {summary}
          </Text>
        </View>
        <Icon name="pen-to-square" size={16} className="text-text-secondary" />
      </Pressable>
    </View>
  );
}
