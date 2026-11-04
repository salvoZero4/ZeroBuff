import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { formatRestDuration, parseRestDuration } from "../utils/restDuration";

export function RestDurationModal({
  initialSeconds,
  all,
  onApply,
  onClose,
}: {
  initialSeconds: number;
  all: boolean;
  onApply: (seconds: number) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState(
    String(Math.floor(initialSeconds / 60)),
  );
  const [seconds, setSeconds] = useState(String(initialSeconds % 60));
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        className="flex-1 justify-end bg-black/75"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close rest duration"
          className="absolute inset-0"
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          className="gap-lg rounded-t-lg border-t border-border bg-bg p-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center gap-md">
            <View className="flex-1 gap-xs">
              <Text
                accessibilityRole="header"
                className="font-body-bold text-xl text-text-primary"
              >
                {all ? "Rest for all exercises" : "Rest duration"}
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                {all
                  ? "Replaces existing rest times. Individual changes are still available."
                  : "Time between sets for this exercise."}
              </Text>
            </View>
            <IconButton
              icon="xmark"
              label="Close rest duration"
              variant="bare"
              onPress={onClose}
            />
          </View>
          <View className="flex-row flex-wrap gap-sm">
            {[60, 90, 120, 180].map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${Math.floor(value / 60)} minutes ${value % 60} seconds rest`}
                accessibilityState={{
                  selected:
                    String(Math.floor(value / 60)) === minutes &&
                    String(value % 60) === seconds,
                }}
                onPress={() => {
                  setMinutes(String(Math.floor(value / 60)));
                  setSeconds(String(value % 60));
                  setError(null);
                }}
                className={`min-h-12 min-w-12 items-center justify-center rounded-sm px-md ${String(Math.floor(value / 60)) === minutes && String(value % 60) === seconds ? "bg-surface-raised" : "bg-surface"}`}
              >
                <Text className="font-numeric text-xl text-text-primary">
                  {formatRestDuration(value)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row gap-md">
            <View className="flex-1">
              <TextField
                label="Minutes"
                value={minutes}
                keyboardType="number-pad"
                onChangeText={(value) => {
                  setMinutes(value);
                  setError(null);
                }}
              />
            </View>
            <View className="flex-1">
              <TextField
                label="Seconds"
                value={seconds}
                keyboardType="number-pad"
                onChangeText={(value) => {
                  setSeconds(value);
                  setError(null);
                }}
              />
            </View>
          </View>
          {error && (
            <Text
              accessibilityRole="alert"
              className="font-body text-caption text-danger"
            >
              {error}
            </Text>
          )}
          <Button
            label={all ? "Apply to all" : "Apply rest"}
            onPress={() => {
              try {
                onApply(parseRestDuration(minutes, seconds));
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
