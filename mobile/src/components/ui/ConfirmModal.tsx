import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./IconButton";
import { Button, type ButtonVariant } from "./Button";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  isDestructive?: boolean;
  isPending?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = "primary",
  isDestructive = false,
  isPending = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
      <View className="flex-1 justify-end bg-black/75">
        <Pressable
          accessibilityLabel={t("Dismiss confirmation")}
          accessibilityRole="button"
          className="absolute inset-0"
          disabled={isPending}
          onPress={onCancel}
        />

        <View
          accessibilityViewIsModal
          className="max-h-[85%] gap-lg rounded-t-lg border-t border-border bg-bg p-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <ScrollView bounces={false} contentContainerClassName="gap-sm">
            <View className="flex-row items-center gap-md">
              <Text
                accessibilityRole="header"
                className="flex-1 font-body-bold text-xl text-text-primary"
              >
                {title}
              </Text>
              <IconButton
                icon="xmark"
                label={t("Close confirmation")}
                variant="bare"
                disabled={isPending}
                onPress={onCancel}
              />
            </View>
            {description ? (
              <Text className="font-body text-body leading-6 text-text-secondary">
                {description}
              </Text>
            ) : null}
          </ScrollView>

          <View className="gap-sm">
            <Button
              variant={resolvedVariant}
              label={confirmLabel ?? t("Confirm")}
              disabled={isPending || confirmDisabled}
              onPress={onConfirm}
            />

            <Button
              disabled={isPending}
              variant="ghost"
              label={cancelLabel ?? t("Cancel")}
              onPress={onCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
