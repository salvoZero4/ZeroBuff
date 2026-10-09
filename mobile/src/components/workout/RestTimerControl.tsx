import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "../ui/Icon";

type RestTimerControlProps = {
  defaultSeconds: number;
};

export function RestTimerControl({ defaultSeconds }: RestTimerControlProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setSecondsLeft(null);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((s) => (s !== null ? s - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  function startTimer() {
    setSecondsLeft(defaultSeconds > 0 ? defaultSeconds : 90);
  }

  function adjustTime(amount: number) {
    setSecondsLeft((prev) => Math.max(0, (prev ?? defaultSeconds) + amount));
  }

  function stopTimer() {
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

      {/* Cifra grande e centrata */}
      <Text
        className={`font-numeric-bold text-4xl tracking-wider ${
          isRunning ? "text-accent" : "text-text-primary"
        }`}
      >
        {timeFormatted}
      </Text>

      {/* Comandi ampi e facili da premere */}
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
              Skip
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={startTimer}
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
