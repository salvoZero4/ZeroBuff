import { Pressable, Text, type PressableProps } from "react-native";
import { Icon, type IconName } from "./Icon";

const VARIANTS = {
  primary: {
    box: "min-h-14 rounded-md bg-accent active:bg-accent-pressed",
    label: "font-body-semibold text-body text-on-accent",
    icon: "text-on-accent",
  },
  outline: {
    box: "min-h-14 rounded-md border border-border bg-bg active:bg-surface-raised",
    label: "font-body-semibold text-body text-text-primary",
    icon: "text-accent",
  },
  ghost: {
    box: "min-h-12 rounded-sm active:bg-surface",
    label: "font-body-semibold text-body text-text-primary",
    icon: "text-text-secondary",
  },
  danger: {
    box: "min-h-14 rounded-md border border-danger bg-bg active:bg-surface",
    label: "font-body-semibold text-body text-danger",
    icon: "text-danger",
  },
  header: {
    box: "min-h-12 min-w-12 justify-center rounded-sm bg-accent px-md active:bg-accent-pressed",
    label: "font-body-bold text-caption text-on-accent",
    icon: "",
  },
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

type ButtonProps = Omit<PressableProps, "children" | "className"> & {
  label: string;
  variant?: ButtonVariant;
  icon?: IconName;
};

export function Button({
  label,
  variant = "primary",
  icon,
  disabled,
  accessibilityState,
  ...props
}: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(disabled),
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`flex-row items-center justify-center gap-sm px-lg py-sm ${v.box} ${disabled ? "opacity-50" : ""}`}
    >
      {icon && <Icon name={icon} className={v.icon} />}
      <Text className={`shrink text-center ${v.label}`}>{label}</Text>
    </Pressable>
  );
}
