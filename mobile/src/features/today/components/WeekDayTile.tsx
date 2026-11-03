import { Text, View } from "react-native";

type WeekDayTileProps = {
  label: string;
  number: number;
  isToday: boolean;
  hasRoutine?: boolean;
};

export function WeekDayTile({
  label,
  number,
  isToday,
  hasRoutine = false,
}: WeekDayTileProps) {
  const containerStyle = isToday
    ? "border-accent bg-accent"
    : hasRoutine
      ? "border-border bg-surface-raised"
      : "border-border bg-surface";

  const labelStyle = isToday
    ? "text-on-accent"
    : hasRoutine
      ? "text-text-secondary"
      : "text-text-secondary";

  const numberStyle = isToday
    ? "text-on-accent"
    : hasRoutine
      ? "text-text-primary"
      : "text-text-secondary";

  return (
    <View
      className={`min-h-16 flex-1 items-center justify-center rounded-sm border ${containerStyle}`}
    >
      <Text className={`font-body-bold text-caption ${labelStyle}`}>
        {label}
      </Text>
      <Text className={`font-numeric-bold text-xl ${numberStyle}`}>
        {number}
      </Text>

      {!isToday && hasRoutine && (
        <View className="bottom-0 h-1 w-1 rounded-full bg-accent" />
      )}
    </View>
  );
}
