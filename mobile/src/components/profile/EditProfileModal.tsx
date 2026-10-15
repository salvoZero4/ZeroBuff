import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/utils/api/errors";
import {
  updateCurrentUser,
  type UserNewInfo,
  type UserResponse,
} from "@/utils/api/user";

export type EditableProfileField = "username" | "height" | "dob" | null;
type HeightUnit = "cm" | "ft";

// Conversioni cm feet & inches
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54 * 10) / 10;
}

export function formatHeightDetail(heightCm?: number | null): string {
  if (!heightCm) return "";
  const { feet, inches } = cmToFeetInches(heightCm);
  return `${Math.round(heightCm)} cm (${feet}' ${inches}")`;
}

type EditProfileFieldModalProps = {
  field: EditableProfileField;
  user?: UserResponse | null;
  onClose: () => void;
};

export function EditProfileFieldModal({
  field,
  user,
  onClose,
}: EditProfileFieldModalProps) {
  const queryClient = useQueryClient();

  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [cmInput, setCmInput] = useState("");
  const [feetInput, setFeetInput] = useState("");
  const [inchesInput, setInchesInput] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!field) return;
    setError(null);

    if (field === "username") {
      setUsername(user?.username ?? "");
    } else if (field === "dob") {
      setDob(user?.date_of_birth ?? "");
    } else if (field === "height") {
      if (user?.height_cm) {
        setCmInput(String(Math.round(user.height_cm)));
        const { feet, inches } = cmToFeetInches(user.height_cm);
        setFeetInput(String(feet));
        setInchesInput(String(inches));
      } else {
        setCmInput("");
        setFeetInput("");
        setInchesInput("");
      }
    }
  }, [field, user]);

  function switchHeightUnit(nextUnit: HeightUnit) {
    setError(null);
    if (nextUnit === heightUnit) return;

    if (nextUnit === "ft" && cmInput.trim()) {
      const parsedCm = Number.parseFloat(cmInput.replace(",", "."));
      if (Number.isFinite(parsedCm) && parsedCm > 0) {
        const { feet, inches } = cmToFeetInches(parsedCm);
        setFeetInput(String(feet));
        setInchesInput(String(inches));
      }
    } else if (nextUnit === "cm" && (feetInput.trim() || inchesInput.trim())) {
      const f = Number.parseInt(feetInput, 10) || 0;
      const inc = Number.parseInt(inchesInput, 10) || 0;
      if (f > 0 || inc > 0) {
        setCmInput(String(Math.round(feetInchesToCm(f, inc))));
      }
    }
    setHeightUnit(nextUnit);
  }

  const { mutate: saveField, isPending } = useMutation({
    mutationFn: (payload: UserNewInfo) => updateCurrentUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || "Could not update value.");
      } else {
        setError("Network error. Please try again.");
      }
    },
  });

  function handleSubmit() {
    setError(null);

    if (field === "username") {
      const trimmed = username.trim();
      if (trimmed.length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }
      saveField({ username: trimmed });
      return;
    }

    if (field === "dob") {
      const trimmed = dob.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        setError("Use YYYY-MM-DD format (e.g. 2002-05-14).");
        return;
      }
      saveField({ date_of_birth: trimmed });
      return;
    }

    if (field === "height") {
      let finalCm = 0;

      if (heightUnit === "cm") {
        finalCm = Number.parseFloat(cmInput.replace(",", "."));
      } else {
        const f = Number.parseInt(feetInput, 10) || 0;
        const i = Number.parseInt(inchesInput, 10) || 0;
        if (i < 0 || i >= 12) {
          setError("Inches must be between 0 and 11.");
          return;
        }
        finalCm = feetInchesToCm(f, i);
      }

      if (!Number.isFinite(finalCm) || finalCm <= 50 || finalCm >= 250) {
        setError("Enter a valid height (between 50 and 249 cm).");
        return;
      }

      saveField({ height_cm: finalCm });
    }
  }

  const modalTitle =
    field === "username"
      ? "Edit username"
      : field === "height"
        ? "Edit height"
        : "Date of birth";

  const modalSubtitle =
    field === "username"
      ? "How should we call you?"
      : field === "height"
        ? "Choose centimeters or feet & inches"
        : "Format: YYYY-MM-DD";

  return (
    <Modal
      animationType="slide"
      transparent
      visible={field !== null}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        className="flex-1 justify-end bg-black/65"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close modal"
          className="absolute inset-0"
          onPress={onClose}
        />

        <View
          onStartShouldSetResponder={() => true}
          className="gap-lg rounded-t-lg border border-border bg-surface p-xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                {modalTitle}
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                {modalSubtitle}
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

          {/* Contenuto dinamico in base al campo cliccato */}
          {field === "username" ? (
            <TextField
              label="Username"
              placeholder="Your username"
              autoCapitalize="none"
              value={username}
              onChangeText={(val) => {
                setUsername(val);
                setError(null);
              }}
              error={error}
              editable={!isPending}
            />
          ) : null}

          {field === "dob" ? (
            <TextField
              label="Date of birth"
              placeholder="e.g. 2002-05-14"
              value={dob}
              onChangeText={(val) => {
                setDob(val);
                setError(null);
              }}
              error={error}
              editable={!isPending}
            />
          ) : null}

          {field === "height" ? (
            <View className="gap-md">
              {/* Selettore unità cm vs ft/in */}
              <View className="flex-row rounded-sm border border-border bg-surface-raised p-xs">
                {(
                  [
                    { key: "cm", label: "Centimeters (cm)" },
                    { key: "ft", label: "Feet & Inches (ft/in)" },
                  ] as const
                ).map((item) => {
                  const selected = heightUnit === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => switchHeightUnit(item.key)}
                      className={`min-h-10 flex-1 items-center justify-center rounded-sm ${
                        selected ? "bg-accent" : ""
                      }`}
                    >
                      <Text
                        className={`font-body-semibold text-caption ${
                          selected ? "text-on-accent" : "text-text-secondary"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {heightUnit === "cm" ? (
                <TextField
                  label="Height (cm)"
                  placeholder="e.g. 178"
                  keyboardType="decimal-pad"
                  value={cmInput}
                  onChangeText={(val) => {
                    setCmInput(val);
                    setError(null);
                  }}
                  error={error}
                  editable={!isPending}
                />
              ) : (
                <View className="gap-xs">
                  <View className="flex-row gap-md">
                    <View className="flex-1">
                      <TextField
                        label="Feet (ft)"
                        placeholder="5"
                        keyboardType="number-pad"
                        value={feetInput}
                        onChangeText={(val) => {
                          setFeetInput(val);
                          setError(null);
                        }}
                        editable={!isPending}
                      />
                    </View>
                    <View className="flex-1">
                      <TextField
                        label="Inches (in)"
                        placeholder="10"
                        keyboardType="number-pad"
                        value={inchesInput}
                        onChangeText={(val) => {
                          setInchesInput(val);
                          setError(null);
                        }}
                        editable={!isPending}
                      />
                    </View>
                  </View>
                  {error ? (
                    <Text className="font-body text-caption text-danger">
                      {error}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          ) : null}

          <Button
            label={isPending ? "Saving..." : "Save"}
            onPress={handleSubmit}
            disabled={isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
