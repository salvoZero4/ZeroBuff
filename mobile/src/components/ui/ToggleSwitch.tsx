import { Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";

type ToggleSwitchProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityHint?: string;
};

export function ToggleSwitch({
  label,
  value,
  onValueChange,
  disabled = false,
  accessibilityHint,
}: ToggleSwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={`min-h-12 flex-row items-center gap-sm rounded-sm border border-transparent px-sm focus:border-text-secondary active:bg-surface-raised ${disabled ? "opacity-50" : ""}`}
    >
      <Text className="shrink font-body text-caption text-text-secondary">
        {label}
      </Text>
      <View
        pointerEvents="none"
        className={`h-7 w-12 shrink-0 flex-row items-center rounded-full border px-1 ${value ? "justify-end border-accent bg-accent" : "justify-start border-text-disabled bg-surface"}`}
      >
        <View
          className={`size-5 items-center justify-center rounded-full ${value ? "bg-on-accent" : "bg-text-secondary"}`}
        >
          {value && <Icon name="check" size={10} className="text-accent" />}
        </View>
      </View>
    </Pressable>
  );
}
