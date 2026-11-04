import { Text, View } from "react-native";

type InfoCardProps = {
  title: string;
  description: string;
};

export function InfoCard({ title, description }: InfoCardProps) {
  return (
    <View className="gap-sm py-sm">
      <Text className="font-body-bold text-xl text-text-primary">{title}</Text>
      <Text className="font-body text-caption leading-5 text-text-secondary">
        {description}
      </Text>
    </View>
  );
}
