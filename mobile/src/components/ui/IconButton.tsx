import {
  ActivityIndicator,
  Pressable,
  type ActivityIndicatorProps,
} from "react-native";
import { styled } from "nativewind";
import { Icon, type IconName } from "./Icon";

const Indicator = (
  props: Pick<ActivityIndicatorProps, "color" | "style" | "accessibilityLabel">,
) => <ActivityIndicator {...props} />;

const StyledActivityIndicator = styled(Indicator, {
  className: { target: "style", nativeStyleMapping: { color: "color" } },
});

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
  disabled?: boolean;
  busy?: boolean;
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
  disabled = false,
  busy = false,
}: IconButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityState={{ disabled: disabled || busy, busy }}
      className={`h-12 w-12 items-center justify-center ${v.box}`}
    >
      {busy ? (
        <StyledActivityIndicator
          accessibilityLabel={label}
          className={v.icon}
        />
      ) : (
        <Icon name={icon} size={iconSize} className={iconClassName ?? v.icon} />
      )}
    </Pressable>
  );
}
