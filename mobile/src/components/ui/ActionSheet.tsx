import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./IconButton";
import { Icon, type IconName } from "./Icon";

export type SheetAction = {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
};
export function ActionSheet({
  visible,
  title,
  subtitle,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/75">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close actions"
          className="absolute inset-0"
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          className="max-h-[80%] gap-md rounded-t-lg border-t border-border bg-bg p-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center gap-md">
            <View className="flex-1 gap-xs">
              <Text
                accessibilityRole="header"
                className="font-body-bold text-xl text-text-primary"
              >
                {title}
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                {subtitle}
              </Text>
            </View>
            <IconButton
              icon="xmark"
              label="Close actions"
              variant="bare"
              onPress={onClose}
            />
          </View>
          <ScrollView
            bounces={false}
            contentContainerClassName="pb-sm"
            showsVerticalScrollIndicator={false}
          >
            <View>
              {actions.map((action, index) => (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  onPress={action.onPress}
                  className={`min-h-14 flex-row items-center gap-md py-lg active:bg-surface ${index < actions.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Icon
                    name={action.icon}
                    size={18}
                    className={
                      action.destructive ? "text-danger" : "text-text-primary"
                    }
                  />
                  <Text
                    className={`flex-1 font-body-semibold text-body ${action.destructive ? "text-danger" : "text-text-primary"}`}
                  >
                    {action.label}
                  </Text>
                  {!action.destructive && (
                    <Icon
                      name="chevron-right"
                      className="text-text-secondary"
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
