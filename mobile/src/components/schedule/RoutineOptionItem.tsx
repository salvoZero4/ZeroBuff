import { Pressable, Text } from "react-native";
import { Icon } from "../ui/Icon";

type RoutineOptionItemProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function RoutineOptionItem({
  label,
  selected,
  onPress,
}: RoutineOptionItemProps) {
  return (
    <Pressable
      accessibilityLabel={`Set ${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-14 flex-row items-center justify-between rounded-sm border px-lg ${
        selected ? "border-accent bg-accent" : "border-border bg-surface-raised"
      }`}
      onPress={onPress}
    >
      <Text
        className={`font-body-semibold text-body ${
          selected ? "text-on-accent" : "text-text-primary"
        }`}
      >
        {label}
      </Text>
      {selected ? (
        <Icon name="check" size={16} className="text-on-accent" />
      ) : null}
    </Pressable>
  );
}
