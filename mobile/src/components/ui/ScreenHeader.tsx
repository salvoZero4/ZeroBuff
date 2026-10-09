import { View, Text } from "react-native";

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
};

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View className="gap-xs">
      <Text className="font-body-bold text-title leading-10 text-text-primary">
        {title}
      </Text>
      <Text className="font-body text-body text-text-secondary">
        {subtitle}
      </Text>
    </View>
  );
}
