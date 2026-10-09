import { Pressable, Text, View } from "react-native";
import { Icon } from "../ui/Icon";

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
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const formattedDuration = `${mins < 10 ? "0" : ""}${mins}:${
    secs < 10 ? "0" : ""
  }${secs}`;

  return (
    <View className="flex-row items-center justify-between border-b border-border bg-surface px-md py-sm">
      {/* Tasto per tornare alla schermata precedente (minimizza sessione) */}
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-raised"
      >
        <Icon name="arrow-left" size={18} className="text-text-primary" />
      </Pressable>

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
          size={14}
          className={isPaused ? "text-accent" : "text-text-secondary"}
        />
        <View className="items-center">
          <Text className="font-numeric-bold text-xl text-text-primary">
            {formattedDuration}
          </Text>
          {isPaused && (
            <Text className="font-body-bold text-[10px] uppercase text-accent">
              Paused
            </Text>
          )}
        </View>
      </Pressable>

      {/* Tasto Termina */}
      <Pressable
        accessibilityRole="button"
        onPress={onFinish}
        className="min-h-10 justify-center rounded-sm bg-accent px-md active:bg-accent-pressed"
      >
        <Text className="font-body-bold text-caption text-on-accent">
          Finish
        </Text>
      </Pressable>
    </View>
  );
}
