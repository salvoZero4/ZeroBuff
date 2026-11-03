import { useEffect, useState } from "react";
import { AppState, Pressable, Switch, Text, View } from "react-native";
import { startForegroundTicker } from "@/features/workout/utils/foregroundTicker";
import { useBackgroundRestTimerFeedback } from "@/features/workout/notifications/BackgroundRestTimerProvider";
import { Icon } from "@/components/ui/Icon";

type RestTimerControlProps = {
  defaultSeconds: number;
  targetEndTimestamp: number | null;
  onTargetChange: (value: number | null) => void;
  autoRestEnabled: boolean;
  onToggleAutoRest: () => void;
};

export function RestTimerControl({
  defaultSeconds,
  targetEndTimestamp,
  onTargetChange,
  autoRestEnabled,
  onToggleAutoRest,
}: RestTimerControlProps) {
  const background = useBackgroundRestTimerFeedback();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!targetEndTimestamp) {
      const reset = setTimeout(() => setSecondsLeft(null), 0);
      return () => clearTimeout(reset);
    }

    return startForegroundTicker(AppState, () => {
      const remaining = Math.max(
        0,
        Math.ceil((targetEndTimestamp - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
      return remaining > 0;
    });
  }, [targetEndTimestamp]);

  function startTimer(seconds?: number) {
    const duration = seconds ?? (defaultSeconds > 0 ? defaultSeconds : 90);
    onTargetChange(Date.now() + duration * 1000);
  }

  function adjustTime(amountSeconds: number) {
    if (!targetEndTimestamp) return;
    onTargetChange(targetEndTimestamp + amountSeconds * 1000);
  }

  function stopTimer() {
    onTargetChange(null);
    setSecondsLeft(null);
  }

  const isRunning = secondsLeft !== null && secondsLeft > 0;
  const displaySeconds = secondsLeft ?? defaultSeconds;
  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const timeFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

  return (
    <View className="items-center gap-sm py-md">
      <Text
        accessibilityLiveRegion="polite"
        className="font-body text-body text-text-secondary"
      >
        {isRunning
          ? "Resting"
          : secondsLeft === 0
            ? "Rest complete"
            : "Rest timer"}
      </Text>
      <Text
        accessibilityLabel={`${mins} minutes ${secs} seconds`}
        className="font-numeric-bold text-8xl text-text-primary"
      >
        {timeFormatted}
      </Text>
      <View className="flex-row items-center justify-center gap-lg">
        {isRunning ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove 15 seconds"
            onPress={() => adjustTime(-15)}
            className="min-h-12 min-w-16 items-center justify-center rounded-sm border border-border"
          >
            <Text className="font-numeric text-body text-text-secondary">
              −15s
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRunning ? "Skip rest" : "Start rest"}
          onPress={isRunning ? stopTimer : () => startTimer()}
          className="min-h-12 min-w-24 flex-row items-center justify-center gap-sm rounded-sm border border-border px-lg"
        >
          <Icon
            name={isRunning ? "xmark" : "play"}
            size={14}
            className="text-text-primary"
          />
          <Text className="font-body-semibold text-body text-text-primary">
            {isRunning ? "Skip" : "Start"}
          </Text>
        </Pressable>
        {isRunning ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add 30 seconds"
            onPress={() => adjustTime(30)}
            className="min-h-12 min-w-16 items-center justify-center rounded-sm border border-border"
          >
            <Text className="font-numeric text-body text-text-secondary">
              +30s
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="min-h-12 flex-row items-center gap-sm">
        <Text className="font-body text-caption text-text-secondary">
          Auto rest
        </Text>
        <View className="min-h-12 min-w-12 items-center justify-center">
          <Switch
            accessibilityLabel="Automatically start rest after saving a set"
            value={autoRestEnabled}
            onValueChange={onToggleAutoRest}
          />
        </View>
      </View>
      {background.message ? (
        <View className="items-center gap-xs">
          <Text
            accessibilityLiveRegion="polite"
            className="text-center font-body text-caption text-text-secondary"
          >
            {background.message}
          </Text>
          {background.onAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={background.onAction}
              className="min-h-12 justify-center px-md"
            >
              <Text className="font-body-semibold text-caption text-text-primary">
                {background.actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
