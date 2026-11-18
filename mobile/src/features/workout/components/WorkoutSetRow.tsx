import { formatNumber } from "@/shared/i18n/i18n";
import { useTranslation } from "react-i18next";
import Animated, {
  Easing,
  ReduceMotion,
  ZoomIn,
} from "react-native-reanimated";
import { isSetSaved, WEIGHT_UNIT } from "@/features/workout/utils/experience";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Icon } from "@/components/ui/Icon";

import type { ActiveSetLog } from "@/features/workout/types/activeWorkout";

const savedCheckEntrance = ZoomIn.duration(200)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ transform: [{ scale: 0.6 }] })
  .reduceMotion(ReduceMotion.System);

export type PreviousSet = {
  weight: number;
  reps: number;
  date: string;
};

type WorkoutSetRowProps = {
  set: ActiveSetLog;
  previousSet: PreviousSet | null;
  isLast: boolean;
  onUpdate: (changes: Partial<ActiveSetLog>) => void;
  onToggleComplete: () => void;
  onRemove?: () => void;
  onSave: () => void;
  onRetry: () => void;
  disabled?: boolean;
  totalSets?: number;
  onInteract?: () => void;
};

function formatValue(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 1 });
}

export function WorkoutSetRow({
  set,
  previousSet,
  isLast,
  onUpdate,
  onToggleComplete,
  onRemove,
  onSave,
  onRetry,
  disabled = false,
  totalSets,
  onInteract,
}: WorkoutSetRowProps) {
  const { t } = useTranslation();
  const saved = isSetSaved(set);
  const pending = disabled || set.saveStatus === "pending";
  const prevWeight = previousSet?.weight ?? null;
  const prevReps = previousSet?.reps ?? null;
  const weightNum = Number.parseFloat(set.weight.replace(",", "."));
  const repsNum = Number.parseInt(set.reps, 10);
  const prevVolume = (prevWeight ?? 0) * (prevReps ?? 0);
  const volumeNum = weightNum * repsNum;

  let trend: "up" | "down" | "equal" | null = null;
  if (
    saved &&
    prevWeight !== null &&
    prevReps !== null &&
    Number.isFinite(weightNum) &&
    Number.isFinite(repsNum)
  ) {
    // Weight is the primary driver: heavier is always progression, even with
    // fewer reps. Otherwise volume (weight × reps) decides, so a lighter set
    // with enough extra reps still counts as progression. Bodyweight sets
    // (weight 0) have no volume: reps are the metric.
    const isBodyweight = weightNum === 0 && prevWeight === 0;
    if (weightNum > prevWeight) trend = "up";
    else if (isBodyweight) {
      if (repsNum > prevReps) trend = "up";
      else if (repsNum < prevReps) trend = "down";
      else trend = "equal";
    } else if (volumeNum > prevVolume) trend = "up";
    else if (weightNum < prevWeight || volumeNum < prevVolume) trend = "down";
    else trend = "equal";
  }

  const trendStyle =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-danger"
        : "text-text-secondary";
  const trendIcon =
    trend === "up"
      ? "arrow-trend-up"
      : trend === "down"
        ? "arrow-trend-down"
        : "minus";

  return (
    <View
      className={`w-full gap-sm rounded-lg border p-lg ${set.completed ? "border-accent/30 bg-surface-raised" : "border-border bg-surface"}`}
    >
      <View className="min-h-12 flex-row flex-wrap items-center justify-between gap-sm">
        <Text className="font-numeric-bold text-lg text-text-primary">
          {t("Set {{number}}", { number: set.setNumber })}
          {totalSets ? t(" of {{total}}", { total: totalSets }) : ""}
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          className="font-body text-caption text-text-secondary"
        >
          {set.saveStatus === "pending"
            ? t("Saving…")
            : set.saveStatus === "dirty"
              ? t("Unsaved changes")
              : saved
                ? t("Saved")
                : ""}
        </Text>
        {isLast && onRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Remove set {{number}}", {
              number: set.setNumber,
            })}
            disabled={pending}
            onPress={onRemove}
            className="min-h-12 flex-row items-center justify-center gap-xs px-sm"
          >
            <Icon name="trash" size={14} className="text-danger" />
            <Text className="font-body text-caption text-danger">
              {t("Remove set")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row gap-sm">
        <View className="flex-1 gap-xs">
          <Text className="font-body text-caption text-text-secondary">
            {t("Weight ·")}{" "}{WEIGHT_UNIT}
          </Text>
          <TextInput
            accessibilityLabel={t("Set {{number}} weight", {
              number: set.setNumber,
            })}
            keyboardType="decimal-pad"
            editable={!pending}
            value={set.weight}
            placeholder="0"
            onFocus={onInteract}
            onChangeText={(weight) => onUpdate({ weight })}
            onBlur={onSave}
            className="min-h-16 rounded-sm border border-border bg-surface-raised px-sm py-xs text-center font-numeric-bold text-[36px] text-text-primary"
          />
        </View>
        <View className="flex-1 gap-xs">
          <Text className="font-body text-caption text-text-secondary">
            {t("Reps")}
          </Text>
          <TextInput
            accessibilityLabel={t("Set {{number}} reps", {
              number: set.setNumber,
            })}
            keyboardType="number-pad"
            editable={!pending}
            value={set.reps}
            placeholder="0"
            onFocus={onInteract}
            onChangeText={(reps) => onUpdate({ reps })}
            onBlur={onSave}
            className="min-h-16 rounded-sm border border-border bg-surface-raised px-sm py-xs text-center font-numeric-bold text-[36px] text-text-primary"
          />
        </View>
        <View className="gap-xs">
          <Text className="font-body text-caption text-text-secondary">
            {t("Done")}
          </Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={
              set.completed
                ? t("Unmark set {{number}} as done", { number: set.setNumber })
                : t("Mark set {{number}} as done", { number: set.setNumber })
            }
            accessibilityState={{
              checked: saved,
              disabled: pending,
              busy: pending,
            }}
            disabled={pending}
            onPress={onToggleComplete}
            className={`min-h-16 w-14 flex-1 items-center justify-center rounded-sm border ${saved ? "border-accent bg-accent" : "border-border bg-surface-raised"}`}
          >
            {set.saveStatus === "pending" ? (
              <ActivityIndicator accessibilityLabel={t("Saving set")} />
            ) : saved ? (
              <Animated.View entering={savedCheckEntrance}>
                <Icon name="check" size={22} className="text-on-accent" />
              </Animated.View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <View className="flex-row items-center gap-md">
        <View className="flex-1 flex-row flex-wrap items-center gap-xs">
          <Text className="font-body text-caption text-text-secondary">
            {t("Previous")}
          </Text>
          <Text className="font-numeric text-body text-text-secondary">
            {previousSet
              ? `${formatValue(previousSet.weight)} ${WEIGHT_UNIT} × ${previousSet.reps}`
              : "—"}
          </Text>
          {previousSet && saved ? (
            <Icon name={trendIcon} size={12} className={trendStyle} />
          ) : null}
        </View>
        <Text className="font-body text-caption text-text-secondary">RIR</Text>
        <TextInput
          accessibilityLabel={t("Set {{number}} RIR (optional)", {
            number: set.setNumber,
          })}
          keyboardType="number-pad"
          editable={!pending}
          value={set.rir}
          placeholder="—"
          onFocus={onInteract}
          onChangeText={(rir) => onUpdate({ rir })}
          onBlur={onSave}
          className="min-h-12 w-12 rounded-sm border border-border bg-surface-raised py-xs text-center font-numeric text-[20px] text-text-primary"
        />
      </View>

      {set.saveStatus === "error" ? (
        <Text
          accessibilityLiveRegion="polite"
          className="font-body text-caption text-danger"
        >
          {t(set.saveError ?? "Could not save. Please retry.")}
        </Text>
      ) : null}
      {set.saveStatus === "error" || set.saveStatus === "dirty" ? (
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={set.saveStatus === "error" ? onRetry : onSave}
          className="min-h-12 items-center justify-center rounded-sm border border-border"
        >
          <Text className="font-body-semibold text-body text-text-primary">
            {set.saveStatus === "error" ? t("Retry") : t("Save changes")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
