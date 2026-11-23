import { useTranslation } from "react-i18next";
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
  action?: "open" | "add" | "detail" | "reuse";
}) {
  const { t } = useTranslation();
  const actionLabel = {
    open: "Open progress for {{name}}",
    add: "Add {{name}}",
    detail: "Open details for {{name}}",
    reuse: "Use {{name}}",
  }[action];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(actionLabel, { name })}
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
        name={action === "add" || action === "reuse" ? "plus" : "chevron-right"}
        size={16}
        className="text-text-secondary"
      />
    </Pressable>
  );
}
