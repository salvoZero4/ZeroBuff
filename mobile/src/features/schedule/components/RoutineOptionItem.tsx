import { Pressable, Text } from "react-native";
import { Icon } from "@/components/ui/Icon";

type RoutineOptionItemProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  isLast?: boolean;
  onPress: () => void;
};

export function RoutineOptionItem({
  label,
  selected,
  onPress,
  disabled = false,
  isLast = false,
}: RoutineOptionItemProps) {
  return (
    <Pressable
      accessibilityLabel={`Set ${label}`}
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ selected, disabled }}
      className={`min-h-14 flex-row items-center gap-md py-lg active:bg-surface ${!isLast ? "border-b border-border" : ""} ${disabled ? "opacity-50" : ""}`}
      onPress={onPress}
    >
      <Text className="flex-1 font-body-semibold text-body text-text-primary">
        {label}
      </Text>
      {selected ? (
        <Icon name="check" size={16} className="text-text-primary" />
      ) : null}
    </Pressable>
  );
}
