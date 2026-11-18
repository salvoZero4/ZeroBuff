import { useTranslation } from "react-i18next";
import { type RoutineExerciseDraft } from "@/features/routines/utils/routineDraft";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { TargetInput } from "@/features/routines/components/TargetInput";
import { formatRestDuration } from "../utils/restDuration";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

type ExerciseEditorProps = {
  exercise: RoutineExerciseDraft;
  displayName: string;
  onChange: (changes: Partial<RoutineExerciseDraft>) => void;
  onRemove: () => void;
  onEditRest: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  drag: () => void;
  isActive: boolean;
  disabled?: boolean;
  isLast: boolean;
};

export function ExerciseEditor({
  exercise,
  displayName,
  onChange,
  onRemove,
  onEditRest,
  onMoveUp,
  onMoveDown,
  drag,
  isActive,
  disabled = false,
  isLast,
}: ExerciseEditorProps) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  // Both native inputs and the rest selector share an explicit, text-scaled height.
  const fieldHeight = Math.max(48, Math.ceil(32 * fontScale));
  const reorderDisabled = disabled || isActive;
  const showReorderButtons = Boolean(onMoveUp || onMoveDown);
  return (
    <View
      className={`relative gap-sm px-sm py-lg ${isLast ? "" : "border-b border-border"} ${isActive ? "rounded-md bg-surface-raised" : "bg-bg"}`}
    >
      {isActive && (
        <View
          pointerEvents="none"
          className="absolute inset-0 rounded-md border border-text-secondary"
        />
      )}
      <View className="flex-row items-center gap-sm">
        <Pressable
          accessible={false}
          disabled={disabled}
          onLongPress={drag}
          delayLongPress={300}
          className={`min-h-12 flex-1 flex-row items-center gap-sm rounded-sm ${isActive ? "" : "active:bg-surface"}`}
        >
          <View className="min-h-12 w-8 items-center justify-center">
            <View
              className={`h-8 w-8 items-center justify-center rounded-sm ${isActive ? "bg-accent" : ""}`}
            >
              <Icon
                name="grip-vertical"
                size={16}
                className={isActive ? "text-on-accent" : "text-text-secondary"}
              />
            </View>
          </View>
          <Text className="flex-1 font-body-semibold text-body text-text-primary">
            {displayName}
          </Text>
        </Pressable>
        {showReorderButtons && (
          <View className="flex-row">
            <IconButton
              variant="bare"
              icon="chevron-up"
              iconSize={16}
              label={t("Move up: {{name}}", { name: displayName })}
              disabled={reorderDisabled || !onMoveUp}
              iconClassName={
                reorderDisabled || !onMoveUp
                  ? "text-text-disabled"
                  : "text-text-primary"
              }
              onPress={() => onMoveUp?.()}
            />
            <IconButton
              variant="bare"
              icon="chevron-down"
              iconSize={16}
              label={t("Move down: {{name}}", { name: displayName })}
              disabled={reorderDisabled || !onMoveDown}
              iconClassName={
                reorderDisabled || !onMoveDown
                  ? "text-text-disabled"
                  : "text-text-primary"
              }
              onPress={() => onMoveDown?.()}
            />
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Remove {{name}}", { name: displayName })}
          disabled={disabled || isActive}
          accessibilityState={{ disabled: disabled || isActive }}
          onPress={onRemove}
          className={`min-h-12 min-w-12 items-center justify-center rounded-sm active:bg-surface ${isActive ? "opacity-0" : ""}`}
        >
          <Icon name="xmark" size={18} className="text-text-secondary" />
        </Pressable>
      </View>
      <View className={`flex-row gap-sm ${isActive ? "opacity-70" : ""}`}>
        <TargetInput
          height={fieldHeight}
          disabled={disabled || isActive}
          label={t("Sets")}
          accessibilityLabel={t("{{name}} sets", { name: displayName })}
          value={exercise.sets}
          onChangeText={(sets) => onChange({ sets })}
        />
        <TargetInput
          height={fieldHeight}
          disabled={disabled || isActive}
          label={t("Reps")}
          accessibilityLabel={t("{{name}} reps", { name: displayName })}
          value={exercise.reps}
          onChangeText={(reps) => onChange({ reps })}
        />
        <View className="flex-1 gap-xs">
          <Text className="font-body text-caption text-text-secondary">
            {t("Rest")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              "{{name}} rest: {{duration}}, minutes and seconds",
              {
                name: displayName,
                duration: formatRestDuration(Number(exercise.restSeconds)),
              },
            )}
            disabled={disabled || isActive}
            onPress={onEditRest}
            style={{ height: fieldHeight }}
            className="min-h-12 flex-row items-center justify-center gap-xs rounded-sm border border-border bg-surface px-sm"
          >
            <Text className="font-numeric text-xl text-text-primary">
              {formatRestDuration(Number(exercise.restSeconds))}
            </Text>
            <Icon
              name="chevron-down"
              size={10}
              className="text-text-secondary"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
