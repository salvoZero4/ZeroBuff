import { View, Text, TextInput } from "react-native";

type TargetInputProps = {
  disabled?: boolean;
  height: number;
  accessibilityLabel?: string;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

export function TargetInput({
  label,
  value,
  onChangeText,
  disabled = false,
  height,
  accessibilityLabel = label,
}: TargetInputProps) {
  return (
    <View className="flex-1 gap-xs">
      <Text className="font-body text-caption text-text-secondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        editable={!disabled}
        className="min-h-12 rounded-sm border border-border bg-surface px-sm py-0 text-center font-numeric text-xl text-text-primary placeholder:text-text-secondary"
        style={{
          height,
          includeFontPadding: false,
          textAlignVertical: "center",
        }}
        keyboardType="number-pad"
        onChangeText={onChangeText}
        value={value}
      />
    </View>
  );
}
