import { useState } from "react";
import { Keyboard, Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";
import { SelectPickerModal } from "./SelectPickerModal";
import { changeDatePart, type DatePart } from "@/shared/utils/dates";

const MONTHS = [
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
];

export function DateField({
  value,
  onChange,
  maxDate,
  disabled = false,
}: {
  value: string;
  onChange: (date: string) => void;
  maxDate: string;
  disabled?: boolean;
}) {
  const [active, setActive] = useState<DatePart | null>(null);
  const [year, month, day] = value.split("-").map(Number);
  const [maxYear, maxMonth, maxDay] = maxDate.split("-").map(Number);
  const days = Math.min(
    new Date(year, month, 0).getDate(),
    year === maxYear && month === maxMonth ? maxDay : 31,
  );
  const options =
    active === "year"
      ? Array.from({ length: maxYear - 1930 + 1 }, (_, i) => ({
          label: String(maxYear - i),
          value: String(maxYear - i),
        }))
      : active === "month"
        ? MONTHS.slice(0, year === maxYear ? maxMonth : 12).map((label, i) => ({
            label,
            value: String(i + 1),
          }))
        : Array.from({ length: days }, (_, i) => ({
            label: String(i + 1),
            value: String(i + 1),
          }));
  return (
    <View className="gap-xs">
      <Text className="font-body-semibold text-caption text-text-secondary">
        Date
      </Text>
      <View className="flex-row gap-sm">
        {(["day", "month", "year"] as const).map((part) => (
          <Pressable
            key={part}
            accessibilityRole="button"
            accessibilityLabel={`Select ${part}: ${part === "month" ? MONTHS[month - 1] : part === "day" ? day : year}`}
            accessibilityState={{ disabled, expanded: active === part }}
            disabled={disabled}
            onPress={() => {
              Keyboard.dismiss();
              setActive(part);
            }}
            className={`min-h-14 flex-row items-center justify-between gap-xs rounded-sm border border-border bg-surface-raised px-md ${part === "month" ? "flex-2" : "flex-1"}`}
          >
            <View className="flex-1 gap-xs">
              <Text className="font-body text-caption capitalize text-text-secondary">
                {part}
              </Text>
              <Text
                className="font-body-bold text-body text-text-primary"
                numberOfLines={1}
              >
                {part === "month"
                  ? MONTHS[month - 1]
                  : part === "day"
                    ? day
                    : year}
              </Text>
            </View>
            <Icon
              name="chevron-down"
              size={12}
              className="text-text-secondary"
            />
          </Pressable>
        ))}
      </View>
      <SelectPickerModal
        visible={active !== null}
        title={`Select ${active ?? "date"}`}
        options={options}
        selectedValues={[
          String(active === "year" ? year : active === "month" ? month : day),
        ]}
        onConfirm={(values) => {
          if (active && values[0])
            onChange(changeDatePart(value, active, Number(values[0]), maxDate));
        }}
        onClose={() => setActive(null)}
      />
    </View>
  );
}
