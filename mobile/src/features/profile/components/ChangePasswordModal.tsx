import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useMutation } from "@tanstack/react-query";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/IconButton";
import { ApiError } from "@/shared/api/errors";
import { changePassword } from "@/features/auth/api/auth";

type ChangePasswordModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({
  visible,
  onClose,
}: ChangePasswordModalProps) {
  const insets = useSafeAreaInsets();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    onClose();
  }

  const { mutate: handleSave, isPending } = useMutation({
    mutationFn: () => changePassword({ new_password: newPassword }),
    onSuccess: () => {
      handleClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || "Could not update password.");
      } else {
        setError("Network error. Please try again.");
      }
    },
  });

  function handleSubmit() {
    if (newPassword.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    handleSave();
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={() => {
        if (!isPending) handleClose();
      }}
    >
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        className="flex-1 justify-end bg-black/75"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close password modal"
          className="absolute inset-0"
          disabled={isPending}
          onPress={handleClose}
        />

        <View
          onStartShouldSetResponder={() => true}
          className="gap-lg rounded-t-lg border-t border-border bg-bg p-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center gap-md">
            <View className="flex-1 gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                Change password
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Choose a new password for your account
              </Text>
            </View>
            <IconButton
              icon="xmark"
              label="Close"
              variant="bare"
              disabled={isPending}
              onPress={handleClose}
            />
          </View>

          <TextField
            label="New password"
            placeholder="At least 8 characters"
            secureTextEntry
            value={newPassword}
            onChangeText={(val) => {
              setNewPassword(val);
              setError(null);
            }}
            editable={!isPending}
          />

          <TextField
            label="Confirm password"
            placeholder="Repeat new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              setError(null);
            }}
            error={error}
            editable={!isPending}
          />

          <Button
            label={isPending ? "Updating..." : "Update password"}
            onPress={handleSubmit}
            disabled={isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
