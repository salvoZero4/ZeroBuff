import { View, Text, TextInput } from "react-native";

type TargetInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

export function TargetInput({ label, value, onChangeText }: TargetInputProps) {
  return (
    <View className="flex-1 gap-xs">
      <Text className="font-body text-caption text-text-secondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        className="min-h-12 rounded-sm border border-border bg-surface-raised px-sm text-center font-numeric text-body text-text-primary placeholder:text-text-secondary"
        keyboardType="number-pad"
        onChangeText={onChangeText}
        value={value}
      />
    </View>
  );
}
