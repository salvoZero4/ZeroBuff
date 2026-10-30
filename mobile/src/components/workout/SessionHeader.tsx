import { Pressable, Text, View } from "react-native";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";

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
    <View className="flex-row items-center justify-between border-b border-border bg-surface px-md py-sm">
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
        className={`flex-row items-center gap-sm rounded-sm px-md py-xs active:bg-surface-raised ${
          isPaused ? "border border-accent/40 bg-accent/10" : ""
        }`}
      >
        <Icon
          name={isPaused ? "play" : "pause"}
          size={18}
          className={isPaused ? "text-accent" : "text-text-secondary"}
        />
        <View className="items-center">
          <Text className="font-numeric-bold text-xl text-text-primary">
            {formattedDuration}
          </Text>
        </View>
      </Pressable>

      {/* Tasto Termina */}
      <Button label="Finish" variant="header" onPress={onFinish} />
    </View>
  );
}
