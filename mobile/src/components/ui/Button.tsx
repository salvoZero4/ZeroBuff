import { Pressable, Text, type PressableProps } from "react-native";
import { Icon, type IconName } from "./Icon";

const VARIANTS = {
  primary: {
    box: "rounded-md bg-accent active:bg-accent-pressed",
    label: "font-body-bold text-xl text-on-accent",
    icon: "text-on-accent",
  },
  outline: {
    box: "rounded-sm border border-accent bg-bg active:bg-surface-raised",
    label: "font-body-semibold text-body text-text-primary",
    icon: "text-accent",
  },
  danger: {
    box: "rounded-md bg-danger active:bg-danger/80",
    label: "font-body-bold text-xl text-white",
    icon: "text-white",
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
  ...props
}: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`min-h-14 flex-row items-center justify-center gap-sm px-lg ${v.box}`}
    >
      {icon && <Icon name={icon} className={v.icon} />}
      <Text className={v.label}>{label}</Text>
    </Pressable>
  );
}
