import { View, type ViewProps } from "react-native";

const VARIANTS = {
  default: "border-border bg-surface",
  accent: "border-accent/30 bg-surface-raised",
} as const;

type CardProps = ViewProps & {
  variant?: keyof typeof VARIANTS;
  className?: string;
};

export function Card({
  variant = "default",
  className = "",
  ...props
}: CardProps) {
  return (
    <View
      className={`rounded-md border p-lg ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
