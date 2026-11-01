import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/Icon";

type SettingRowProps = {
  title: string;
  detail: string;
  trailing?: ReactNode;
  isLast?: boolean;
  onPress?: () => void;
};

export function SettingRow({
  title,
  detail,
  trailing,
  isLast = false,
  onPress,
}: SettingRowProps) {
  return (
    <Pressable
      accessibilityLabel={`${title}: ${detail}`}
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      className={`min-h-18 flex-row items-center gap-md px-lg py-md active:bg-surface-raised ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      <View className="flex-1 gap-xs">
        <Text className="font-body-semibold text-body text-text-primary">
          {title}
        </Text>
        <Text className="font-body text-caption text-text-secondary">
          {detail}
        </Text>
      </View>

      {trailing ??
        (onPress ? (
          <Icon
            name="chevron-right"
            size={15}
            className="text-text-secondary"
          />
        ) : null)}
    </Pressable>
  );
}
