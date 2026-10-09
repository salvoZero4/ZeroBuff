import type { ReactNode } from "react";
import { Text, View } from "react-native";

type SectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function Section({ title, children, className = "" }: SectionProps) {
  return (
    <View className={`gap-sm ${className}`}>
      <View className="flex-row items-center justify-between">
        <Text className="font-body-semibold text-body text-text-primary">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}
