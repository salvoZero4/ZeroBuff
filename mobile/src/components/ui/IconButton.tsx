// components/ui/IconButton.tsx
import { Pressable } from "react-native";

import { Icon, type IconName } from "./Icon";

const VARIANTS = {
  accent: {
    box: "rounded-full bg-accent active:bg-accent-pressed",
    icon: "text-on-accent",
  },
  surface: {
    box: "rounded-full border border-border bg-surface",
    icon: "text-accent",
  },
  bare: {
    box: "rounded-sm active:bg-surface-raised",
    icon: "text-text-primary",
  },
} as const;

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: keyof typeof VARIANTS;
  iconSize?: number;
  iconClassName?: string;
};

export function IconButton({
  icon,
  label,
  onPress,
  variant = "surface",
  iconSize = 20,
  iconClassName,
}: IconButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`h-12 w-12 items-center justify-center ${v.box}`}
    >
      <Icon name={icon} size={iconSize} className={iconClassName ?? v.icon} />
    </Pressable>
  );
}
