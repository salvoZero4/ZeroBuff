// components/ui/Icon.tsx
import { FontAwesome6 } from "@react-native-vector-icons/fontawesome6";
import { styled } from "nativewind";

const StyledFontAwesome6 = styled(FontAwesome6, {
  className: { target: "style", nativeStyleMapping: { color: "color" } },
});

// Add a name here when you need a new icon
export type IconName =
  | "house"
  | "calendar-day"
  | "chart-simple"
  | "user"
  | "plus"
  | "pen-to-square"
  | "arrow-left"
  | "chevron-up"
  | "chevron-down"
  | "chevron-right"
  | "trash"
  | "grip-vertical"
  | "check"
  | "play"
  | "pause"
  | "stopwatch"
  | "ruler-vertical"
  | "venus-mars"
  | "cake-candles"
  | "lock"
  | "circle-info"
  | "xmark";

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
};

export function Icon({
  name,
  size = 16,
  className = "text-accent",
}: IconProps) {
  return (
    <StyledFontAwesome6
      name={name}
      iconStyle="solid"
      size={size}
      className={className}
    />
  );
}
