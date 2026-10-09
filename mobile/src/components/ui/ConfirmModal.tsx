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
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const resolvedVariant = isDestructive ? "danger" : confirmVariant;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      {/* Contenitore a schermo intero centrato verticalmente con margine laterale */}
      <View className="flex-1 justify-center bg-black/75 px-lg">
        {/* Backdrop: intercetta i tocchi all'esterno per chiudere */}
        <Pressable
          accessibilityLabel="Dismiss confirmation"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onCancel}
        />

        {/* Card modale: si estende a tutta larghezza tra i padding px-lg */}
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
              onPress={onConfirm}
            />

            <Button variant="outline" label={cancelLabel} onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
