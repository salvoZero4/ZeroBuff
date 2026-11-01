import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/shared/api/errors";
import {
  updateCurrentUser,
} from "@/features/profile/api/user";
import type { UserNewInfo, UserResponse } from "@/features/profile/types/user";
import {
  SelectPickerModal,
  type PickerOption,
} from "@/components/ui/SelectPickerModal";

export type EditableProfileField = "username" | "height" | "dob" | null;
type HeightUnit = "cm" | "ft";
type ActiveDobPicker = "day" | "month" | "year" | null;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

// Conversioni cm / feet & inches
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
  const [username, setUsername] = useState(
    field === "username" ? (user?.username ?? "") : "",
  );

  const [dobDay, setDobDay] = useState<number>(() => {
    const [, , day] = user?.date_of_birth?.split("-").map(Number) ?? [];
    return field === "dob" && day ? day : 14;
  });
  const [dobMonth, setDobMonth] = useState<number>(() => {
    const [, month] = user?.date_of_birth?.split("-").map(Number) ?? [];
    return field === "dob" && month ? month : 5;
  });
  const [dobYear, setDobYear] = useState<number>(() => {
    const [year] = user?.date_of_birth?.split("-").map(Number) ?? [];
    return field === "dob" && year ? year : 2000;
  });
  const [activeDobPicker, setActiveDobPicker] = useState<ActiveDobPicker>(null);

  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [cmInput, setCmInput] = useState(() =>
    field === "height" && user?.height_cm
      ? String(Math.round(user.height_cm))
      : "",
  );
  const [feetInput, setFeetInput] = useState(() => {
    if (field !== "height" || !user?.height_cm) return "";
    return String(cmToFeetInches(user.height_cm).feet);
  });
  const [inchesInput, setInchesInput] = useState(() => {
    if (field !== "height" || !user?.height_cm) return "";
    return String(cmToFeetInches(user.height_cm).inches);
  });
  const [error, setError] = useState<string | null>(null);

  // Opzioni dinamiche per Anno, Mese e Giorno
  const yearOptions: PickerOption[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: PickerOption[] = [];
    for (let y = currentYear; y >= 1930; y--) {
      years.push({ label: String(y), value: String(y) });
    }
    return years;
  }, []);

  const monthOptions: PickerOption[] = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => ({
      label: name,
      value: String(idx + 1),
    }));
  }, []);

  const dayOptions: PickerOption[] = useMemo(() => {
    const daysInMonth = new Date(dobYear, dobMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      return { label: String(dayNum), value: String(dayNum) };
    });
  }, [dobYear, dobMonth]);

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
      const mStr = String(dobMonth).padStart(2, "0");
      const dStr = String(dobDay).padStart(2, "0");
      const formattedDob = `${dobYear}-${mStr}-${dStr}`;

      saveField({ date_of_birth: formattedDob });
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
        : "Select your birth date details";

  return (
    <Modal
      animationType="slide"
      transparent
      visible={field !== null}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
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

          {/* Username Input */}
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

          {/* Selettore Personalizzato Data di Nascita (Giorno - Mese - Anno) */}
          {field === "dob" ? (
            <View className="gap-md">
              <Text className="font-body-semibold text-caption text-text-primary">
                Date of birth
              </Text>

              <View className="flex-row gap-xs">
                {/* Giorno */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveDobPicker("day")}
                  className="min-h-14 flex-1 flex-row items-center justify-between rounded-sm border border-border bg-surface-raised px-md active:bg-surface"
                >
                  <View>
                    <Text className="font-body text-[10px] uppercase text-text-secondary">
                      Day
                    </Text>
                    <Text className="font-body-bold text-body text-text-primary">
                      {dobDay}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-down"
                    size={12}
                    className="text-text-secondary"
                  />
                </Pressable>

                {/* Mese */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveDobPicker("month")}
                  className="min-h-14 flex-2 flex-row items-center justify-between rounded-sm border border-border bg-surface-raised px-md active:bg-surface"
                >
                  <View>
                    <Text className="font-body text-[10px] uppercase text-text-secondary">
                      Month
                    </Text>
                    <Text
                      className="font-body-bold text-body text-text-primary"
                      numberOfLines={1}
                    >
                      {MONTH_NAMES[dobMonth - 1]}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-down"
                    size={12}
                    className="text-text-secondary"
                  />
                </Pressable>

                {/* Anno */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveDobPicker("year")}
                  className="min-h-14 flex-[1.5] flex-row items-center justify-between rounded-sm border border-border bg-surface-raised px-md active:bg-surface"
                >
                  <View>
                    <Text className="font-body text-[10px] uppercase text-text-secondary">
                      Year
                    </Text>
                    <Text className="font-body-bold text-body text-text-primary">
                      {dobYear}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-down"
                    size={12}
                    className="text-text-secondary"
                  />
                </Pressable>
              </View>

              {error ? (
                <Text className="font-body text-caption text-danger">
                  {error}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Height Inputs */}
          {field === "height" ? (
            <View className="gap-md">
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

        {/* Modali di Selezione Singola per Giorno, Mese e Anno */}
        <SelectPickerModal
          visible={activeDobPicker === "day"}
          title="Select Day"
          options={dayOptions}
          selectedValues={[String(dobDay)]}
          multiSelect={false}
          onConfirm={(vals) => {
            if (vals[0]) setDobDay(Number(vals[0]));
            setActiveDobPicker(null);
          }}
          onClose={() => setActiveDobPicker(null)}
        />

        <SelectPickerModal
          visible={activeDobPicker === "month"}
          title="Select Month"
          options={monthOptions}
          selectedValues={[String(dobMonth)]}
          multiSelect={false}
          onConfirm={(vals) => {
            if (vals[0]) {
              const newMonth = Number(vals[0]);
              setDobMonth(newMonth);
              // Ricalcola i giorni se il mese selezionato ha meno giorni del giorno corrente
              const maxDays = new Date(dobYear, newMonth, 0).getDate();
              if (dobDay > maxDays) setDobDay(maxDays);
            }
            setActiveDobPicker(null);
          }}
          onClose={() => setActiveDobPicker(null)}
        />

        <SelectPickerModal
          visible={activeDobPicker === "year"}
          title="Select Year"
          options={yearOptions}
          selectedValues={[String(dobYear)]}
          multiSelect={false}
          onConfirm={(vals) => {
            if (vals[0]) setDobYear(Number(vals[0]));
            setActiveDobPicker(null);
          }}
          onClose={() => setActiveDobPicker(null)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
