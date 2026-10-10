// components/ui/TextField.tsx
import { Text, TextInput, View, type TextInputProps } from "react-native";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  return (
    <View className="gap-xs">
      <Text className="font-body-semibold text-caption text-text-primary">
        {label}
      </Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        className={`min-h-14 rounded-sm border bg-surface px-lg font-body text-body text-text-primary placeholder:text-text-secondary ${
          error ? "border-danger" : "border-border"
        }`}
      />
      {error ? (
        <Text className="font-body text-caption text-danger">{error}</Text>
      ) : null}
    </View>
  );
}
