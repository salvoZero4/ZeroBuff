import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

type SessionHeaderProps = {
  durationSeconds: number;
  isPaused: boolean;
  onBack: () => void;
  onTogglePause: () => void;
  onFinish: () => void;
};

export function SessionHeader({
  durationSeconds,
  isPaused,
  onBack,
  onTogglePause,
  onFinish,
}: SessionHeaderProps) {
  const hours = Math.floor(durationSeconds / 3600);
  const mins = Math.floor((durationSeconds % 3600) / 60);
  const secs = durationSeconds % 60;
  const formattedDuration = `${hours < 10 ? "0" : ""}${hours}:${
    mins < 10 ? "0" : ""
  }${mins}:${secs < 10 ? "0" : ""}${secs}`;

  return (
    <View className="flex-row items-center justify-between border-b border-border bg-bg px-md py-xs">
      <IconButton
        icon="arrow-left"
        label="go back to today page"
        iconSize={18}
        onPress={onBack}
      />

      {/* Controllo Timer e Pausa */}
      <Pressable
        accessibilityLabel={isPaused ? "Resume workout" : "Pause workout"}
        accessibilityRole="button"
        onPress={onTogglePause}
        className={`flex-row items-center gap-sm min-h-12 rounded-sm px-md py-xs active:bg-surface-raised ${
          isPaused ? "border border-accent/40 bg-accent/10" : ""
        }`}
      >
        <Icon
          name={isPaused ? "play" : "pause"}
          size={14}
          className={isPaused ? "text-accent" : "text-text-secondary"}
        />
        <View className="items-center">
          <Text className="font-body text-caption text-text-secondary">
            {isPaused ? "Workout paused" : "Workout time"}
          </Text>
          <Text className="font-numeric text-body text-text-secondary">
            {formattedDuration}
          </Text>
        </View>
      </Pressable>

      {/* Tasto Termina */}
      <Pressable
        accessibilityRole="button"
        onPress={onFinish}
        className="min-h-12 justify-center px-md"
      >
        <Text className="font-body-semibold text-caption text-text-secondary">
          Finish
        </Text>
      </Pressable>
    </View>
  );
}
