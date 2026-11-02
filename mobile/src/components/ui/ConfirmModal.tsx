import { Modal, Pressable, Text, View } from "react-native";
import { Button, type ButtonVariant } from "./Button";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  isDestructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  isDestructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const resolvedVariant = isDestructive ? "danger" : confirmVariant;

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!isPending) onCancel();
      }}
      transparent
      visible={visible}
    >
      <View className="flex-1 justify-center bg-black/75 px-lg">
        <Pressable
          accessibilityLabel="Dismiss confirmation"
          accessibilityRole="button"
          className="absolute inset-0"
          disabled={isPending}
          onPress={onCancel}
        />

        <View
          onStartShouldSetResponder={() => true}
          className="gap-lg rounded-md border border-border bg-surface p-xl"
        >
          <View className="gap-xs">
            <Text className="font-body-bold text-xl text-text-primary">
              {title}
            </Text>
            <Text className="font-body text-body leading-6 text-text-secondary">
              {description}
            </Text>
          </View>

          <View className="gap-sm">
            <Button
              variant={resolvedVariant}
              label={confirmLabel}
              disabled={isPending}
              onPress={onConfirm}
            />

            <Button
              disabled={isPending}
              variant="outline"
              label={cancelLabel}
              onPress={onCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
