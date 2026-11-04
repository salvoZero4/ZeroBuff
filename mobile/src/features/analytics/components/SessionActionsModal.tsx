import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";

export function SessionActionsModal({
  visible,
  date,
  onView,
  onDelete,
  onClose,
}: {
  visible: boolean;
  date: string;
  onView: () => void;
  onDelete: () => void;
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
          accessibilityLabel="Close session actions"
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
                Session actions
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                {date}
              </Text>
            </View>
            <IconButton
              icon="xmark"
              label="Close session actions"
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
              <Pressable
                accessibilityRole="button"
                onPress={onView}
                className="min-h-14 flex-row items-center gap-md border-b border-border py-lg active:bg-surface"
              >
                <Icon name="pen-to-square" size={18} />
                <Text className="flex-1 font-body-semibold text-body text-text-primary">
                  View / edit session
                </Text>
                <Icon name="chevron-right" className="text-text-secondary" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onDelete}
                className="min-h-14 flex-row items-center gap-md py-lg active:bg-surface"
              >
                <Icon name="trash" size={18} className="text-danger" />
                <Text className="flex-1 font-body-semibold text-body text-danger">
                  Delete session
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
