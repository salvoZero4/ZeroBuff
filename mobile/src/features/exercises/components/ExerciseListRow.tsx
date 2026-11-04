import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/Icon";
export function ExerciseListRow({
  name,
  detail,
  onPress,
  isLast,
  action = "open",
}: {
  name: string;
  detail?: string;
  onPress: () => void;
  isLast: boolean;
  action?: "open" | "add";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${action === "add" ? "Add" : "Open progress for"} ${name}`}
      onPress={onPress}
      className={`min-h-14 flex-row items-center gap-md py-lg active:bg-surface ${isLast ? "" : "border-b border-border"}`}
    >
      <View className="flex-1 gap-xs">
        <Text className="font-body-semibold text-body text-text-primary">
          {name}
        </Text>
        {detail ? (
          <Text className="font-body text-caption text-text-secondary">
            {detail}
          </Text>
        ) : null}
      </View>
      <Icon
        name={action === "add" ? "plus" : "chevron-right"}
        size={16}
        className="text-text-secondary"
      />
    </Pressable>
  );
}
