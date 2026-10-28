import { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { Icon } from "../ui/Icon";

type RestTimerControlProps = {
  defaultSeconds: number;
};

export function RestTimerControl({ defaultSeconds }: RestTimerControlProps) {
  const [targetEndTimestamp, setTargetEndTimestamp] = useState<number | null>(
    null,
  );
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!targetEndTimestamp) {
      setSecondsLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.ceil((targetEndTimestamp - now) / 1000);

      if (diff <= 0) {
        setTargetEndTimestamp(null);
        setSecondsLeft(null);
      } else {
        setSecondsLeft(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        updateTimer();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [targetEndTimestamp]);

  function startTimer(seconds?: number) {
    const duration = seconds ?? (defaultSeconds > 0 ? defaultSeconds : 90);
    setTargetEndTimestamp(Date.now() + duration * 1000);
  }

  function adjustTime(amountSeconds: number) {
    if (!targetEndTimestamp) return;
    setTargetEndTimestamp((prev) => {
      if (!prev) return null;
      const newTarget = prev + amountSeconds * 1000;
      return newTarget > Date.now() ? newTarget : Date.now();
    });
  }

  function stopTimer() {
    setTargetEndTimestamp(null);
    setSecondsLeft(null);
  }

  const isRunning = secondsLeft !== null && secondsLeft > 0;
  const displaySeconds = secondsLeft ?? defaultSeconds;
  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const timeFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

  return (
    <View className="items-center justify-center gap-md rounded-md border border-border bg-surface p-lg">
      <Text className="font-body text-caption uppercase tracking-wider text-text-secondary">
        {isRunning ? "Resting" : "Target Rest"}
      </Text>
      <Text
        className={`font-numeric-bold text-4xl tracking-wider ${
          isRunning ? "text-accent" : "text-text-primary"
        }`}
      >
        {timeFormatted}
      </Text>
      {isRunning ? (
        <View className="flex-row items-center gap-md pt-xs">
          <Pressable
            accessibilityRole="button"
            onPress={() => adjustTime(-15)}
            className="min-h-12 min-w-16 items-center justify-center rounded-sm border border-border bg-surface-raised active:bg-surface"
          >
            <Text className="font-numeric-bold text-body text-text-secondary">
              -15s
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => adjustTime(30)}
            className="min-h-12 min-w-16 items-center justify-center rounded-sm border border-border bg-surface-raised active:bg-surface"
          >
            <Text className="font-numeric-bold text-body text-text-primary">
              +30s
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={stopTimer}
            className="min-h-12 min-w-20 items-center justify-center rounded-sm bg-danger/20 active:bg-danger/30"
          >
            <Text className="font-body-semibold text-body text-danger">
              Stop
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => startTimer()}
          className="min-h-12 flex-row items-center justify-center gap-sm rounded-sm bg-accent px-xl active:bg-accent-pressed"
        >
          <Icon name="play" size={14} className="text-on-accent" />
          <Text className="font-body-bold text-body text-on-accent">
            Start rest
          </Text>
        </Pressable>
      )}
    </View>
  );
}
