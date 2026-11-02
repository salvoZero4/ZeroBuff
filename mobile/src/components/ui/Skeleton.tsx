import { View } from "react-native";

export function Skeleton({ className = "h-5 w-full" }: { className?: string }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={`rounded-sm bg-surface-raised ${className}`}
    />
  );
}
