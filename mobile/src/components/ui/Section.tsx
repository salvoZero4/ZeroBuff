import type { ReactNode } from "react";
import { Text, View } from "react-native";

type SectionProps = {
  title: string;
  children: ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return (
    <View className="gap-sm">
      <View className="flex-row items-center justify-between">
        <Text className="font-body-semibold text-body text-text-primary">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}
