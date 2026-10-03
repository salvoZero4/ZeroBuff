import { Text, View } from "react-native";

type TabPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function TabPlaceholder({
  eyebrow,
  title,
  description,
}: TabPlaceholderProps) {
  return (
    <View className="flex-1 justify-center bg-bg p-xl">
      <Text className="mb-sm font-body-bold text-caption uppercase tracking-[1.2px] text-accent">
        {eyebrow}
      </Text>
      <Text className="mb-md font-body-bold text-title text-text-primary">
        {title}
      </Text>
      <Text className="max-w-80 font-body text-body leading-6 text-text-secondary">
        {description}
      </Text>
    </View>
  );
}
