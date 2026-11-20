import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { startForegroundTicker } from "@/features/workout/utils/foregroundTicker";
import { useBackgroundRestTimerFeedback } from "@/features/workout/notifications/BackgroundRestTimerProvider";
import { ActionSheet, type SheetAction } from "@/components/ui/ActionSheet";
import { Icon } from "@/components/ui/Icon";

export const REST_DIGIT_LINE_HEIGHT = 1.18;

type RestTimerControlProps = {
  defaultSeconds: number;
  targetEndTimestamp: number | null;
  pausedRemainingMs: number | null;
  digitSize: number;
  onTargetChange: (value: number | null) => void;
  onPause: () => void;
  onResume: () => void;
  onAdjust: (seconds: number) => void;
  autoRestEnabled: boolean;
  onToggleAutoRest: () => void;
};

export function RestTimerControl({
  defaultSeconds,
  targetEndTimestamp,
  pausedRemainingMs,
  digitSize,
  onTargetChange,
  onPause,
  onResume,
  onAdjust,
  autoRestEnabled,
  onToggleAutoRest,
}: RestTimerControlProps) {
  const { t } = useTranslation();
  const background = useBackgroundRestTimerFeedback();
  const [tick, setTick] = useState<{
    deadline: number;
    remainingMs: number;
  } | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (targetEndTimestamp === null) return;
    return startForegroundTicker(AppState, () => {
      const remainingMs = Math.max(0, targetEndTimestamp - Date.now());
      setTick({ deadline: targetEndTimestamp, remainingMs });
      return remainingMs > 0;
    });
  }, [targetEndTimestamp]);

  const runningMs =
    tick?.deadline === targetEndTimestamp ? tick.remainingMs : null;
  const isRunning = targetEndTimestamp !== null && runningMs !== 0;
  const isPaused = pausedRemainingMs !== null;
  const defaultDuration = defaultSeconds > 0 ? defaultSeconds : 90;
  const displaySeconds = Math.ceil(
    (pausedRemainingMs ??
      runningMs ??
      (isRunning ? defaultDuration : defaultSeconds) * 1000) / 1000,
  );
  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const timeFormatted = `${mins}:${String(secs).padStart(2, "0")}`;

  const primaryLabel = isRunning
    ? t("Pause rest")
    : isPaused
      ? t("Resume rest")
      : t("Start rest");
  const primaryAction = isRunning
    ? onPause
    : isPaused
      ? onResume
      : () => onTargetChange(Date.now() + defaultDuration * 1000);

  function adjustTime(amountSeconds: number) {
    onAdjust(amountSeconds);
    setShowOptions(false);
  }

  const options: SheetAction[] = [
    {
      label: autoRestEnabled ? t("Turn auto rest off") : t("Turn auto rest on"),
      icon: "stopwatch",
      onPress: () => {
        onToggleAutoRest();
        setShowOptions(false);
      },
    },
  ];
  if (isRunning) {
    options.unshift(
      {
        label: t("Remove 15 seconds"),
        icon: "minus",
        onPress: () => adjustTime(-15),
      },
      {
        label: t("Add 30 seconds"),
        icon: "plus",
        onPress: () => adjustTime(30),
      },
    );
  }
  if (background.message && background.onAction && background.actionLabel) {
    options.push({
      label: background.actionLabel,
      icon: "circle-info",
      onPress: () => {
        setShowOptions(false);
        background.onAction?.();
      },
    });
  }
  const status = isPaused
    ? t("Rest paused")
    : isRunning
      ? t("Resting")
      : runningMs === 0
        ? t("Rest complete")
        : t("Rest timer");

  return (
    <View className="items-center gap-xs">
      <Text
        accessibilityLiveRegion="polite"
        className="text-center font-body text-caption text-text-secondary"
      >
        {status}
      </Text>
      <Text
        accessibilityLabel={t("{{minutes}} minutes {{seconds}} seconds", {
          minutes: mins,
          seconds: secs,
        })}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontSize: digitSize,
          lineHeight: Math.ceil(digitSize * REST_DIGIT_LINE_HEIGHT),
        }}
        className="w-full text-center font-numeric-bold text-text-primary"
      >
        {timeFormatted}
      </Text>
      <View className="w-full flex-row items-center justify-center gap-xs">
        <View className="w-12" />
        <View className="shrink flex-row justify-center gap-xs">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            onPress={primaryAction}
            className="min-h-12 min-w-12 shrink flex-row items-center justify-center gap-xs rounded-sm border border-border bg-surface-raised px-sm active:bg-surface"
          >
            <Icon
              name={isRunning ? "pause" : "play"}
              size={14}
              className="text-text-primary"
            />
            <Text className="shrink font-body-semibold text-body text-text-primary">
              {isRunning ? t("Pause") : isPaused ? t("Resume") : t("Start")}
            </Text>
          </Pressable>
          {isRunning || isPaused ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Stop rest")}
              onPress={() => onTargetChange(null)}
              className="min-h-12 min-w-12 shrink flex-row items-center justify-center gap-xs rounded-sm border border-border px-sm active:bg-surface"
            >
              <Icon name="stop" size={14} className="text-text-primary" />
              <Text className="shrink font-body-semibold text-body text-text-primary">
                {t("Stop")}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Timer options")}
          accessibilityHint={background.message ?? undefined}
          onPress={() => setShowOptions(true)}
          className="h-12 w-12 items-center justify-center rounded-sm active:bg-surface-raised"
        >
          <Icon
            name={background.message ? "circle-info" : "ellipsis"}
            className="text-text-primary"
          />
        </Pressable>
      </View>
      <ActionSheet
        visible={showOptions}
        title={t("Timer options")}
        subtitle={background.message ?? undefined}
        actions={options}
        onClose={() => setShowOptions(false)}
      />
    </View>
  );
}
