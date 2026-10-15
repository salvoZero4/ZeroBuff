import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Icon } from "./Icon";
import { Button } from "./Button";

export type PickerOption = {
  label: string;
  value: string;
};

type SelectPickerModalProps = {
  visible: boolean;
  title: string;
  options: readonly PickerOption[];
  selectedValues: string[];
  multiSelect?: boolean;
  onConfirm: (values: string[]) => void;
  onClose: () => void;
};

export function SelectPickerModal({
  visible,
  title,
  options,
  selectedValues,
  multiSelect = false,
  onConfirm,
  onClose,
}: SelectPickerModalProps) {
  const [search, setSearch] = useState("");
  const [currentSelected, setCurrentSelected] =
    useState<string[]>(selectedValues);

  useEffect(() => {
    if (visible) {
      setCurrentSelected(selectedValues);
      setSearch("");
    }
  }, [visible, selectedValues]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search]);

  function handleToggle(value: string) {
    if (multiSelect) {
      setCurrentSelected((prev) =>
        prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev, value],
      );
    } else {
      onConfirm([value]);
      onClose();
    }
  }

  function handleSaveMulti() {
    onConfirm(currentSelected);
    onClose();
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/75"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close picker"
          className="absolute inset-0"
          onPress={onClose}
        />

        <View
          onStartShouldSetResponder={() => true}
          className="max-h-[80%] gap-md rounded-t-lg border border-border bg-surface p-xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-xs">
            <View className="gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                {title}
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                {multiSelect ? "Select one or more items" : "Choose an option"}
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

          {/* Ricerca interna */}
          {options.length > 8 ? (
            <TextInput
              accessibilityLabel={`Search ${title}`}
              placeholder="Search..."
              placeholderTextColor="#737373"
              value={search}
              onChangeText={setSearch}
              className="min-h-12 rounded-sm border border-border bg-surface-raised px-md font-body text-body text-text-primary"
            />
          ) : null}

          {/* Lista Opzioni */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="my-xs max-h-96"
          >
            <View className="overflow-hidden rounded-md border border-border bg-surface-raised">
              {filteredOptions.map((option, index) => {
                const isSelected = currentSelected.includes(option.value);
                const isLast = index === filteredOptions.length - 1;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => handleToggle(option.value)}
                    className={`min-h-14 flex-row items-center justify-between px-lg active:bg-surface ${
                      !isLast ? "border-b border-border" : ""
                    }`}
                  >
                    <Text
                      className={`font-body text-body ${
                        isSelected
                          ? "font-body-bold text-accent"
                          : "text-text-primary"
                      }`}
                    >
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <Icon name="check" size={16} className="text-accent" />
                    ) : null}
                  </Pressable>
                );
              })}

              {filteredOptions.length === 0 ? (
                <View className="p-xl items-center">
                  <Text className="font-body text-caption text-text-secondary">
                    No results matching "{search}"
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {multiSelect ? (
            <Button
              label={`Confirm (${currentSelected.length} selected)`}
              onPress={handleSaveMulti}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
