import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/utils/api/errors";
import { changePassword } from "@/utils/api/auth";

type ChangePasswordModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({
  visible,
  onClose,
}: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [visible]);

  const { mutate: handleSave, isPending } = useMutation({
    mutationFn: () => changePassword({ new_password: newPassword }),
    onSuccess: () => {
      onClose();
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
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        className="flex-1 justify-end bg-black/65"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close password modal"
          className="absolute inset-0"
          onPress={onClose}
        />

        <View
          onStartShouldSetResponder={() => true}
          className="gap-lg rounded-t-lg border border-border bg-surface p-xl"
        >
          <View className="flex-row items-center justify-between">
            <View className="gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                Change password
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Choose a new password for your account
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-surface-raised active:bg-surface"
            >
              <Icon name="xmark" size={14} className="text-text-secondary" />
            </Pressable>
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
