import { Pressable, ScrollView, Text, View } from "react-native";
import { loadErrorMessage } from "@/shared/api/loadError";
import { Button } from "@/components/ui/Button";
import { PERIODS, type Period } from "../utils/progress";
export function Choices<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-sm">
        {values.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: item === value }}
            onPress={() => onChange(item)}
            className={`min-h-12 min-w-12 items-center justify-center rounded-sm px-md ${item === value ? "bg-surface-raised" : "bg-bg"}`}
          >
            <Text
              className={`font-body-semibold text-sm ${item === value ? "text-text-primary" : "text-text-secondary"}`}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
export function PeriodControl({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-xs border-b border-border pb-sm">
      {PERIODS.map((period) => (
        <Pressable
          key={period}
          accessibilityRole="button"
          accessibilityLabel={
            period === "All"
              ? "All time"
              : period === "1M"
                ? "Last month"
                : `Last ${period.slice(0, -1)} months`
          }
          accessibilityState={{ selected: period === value }}
          onPress={() => onChange(period)}
          className={`min-h-12 min-w-12 items-center justify-center rounded-sm px-md ${period === value ? "bg-surface-raised" : "bg-bg"}`}
        >
          <Text
            className={`font-body-semibold text-sm ${period === value ? "text-text-primary" : "text-text-secondary"}`}
          >
            {period === "All" ? "All time" : period}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Empty({ title, message }: { title: string; message: string }) {
  return (
    <View className="gap-sm py-xl">
      <Text className="font-body-semibold text-xl text-text-primary">
        {title}
      </Text>
      <Text className="font-body text-body text-text-secondary">{message}</Text>
    </View>
  );
}
export function QueryNotice({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (error)
    return (
      <View className="gap-sm py-lg">
        <Text className="font-body text-body text-text-secondary">
          {loadErrorMessage(error)}
        </Text>
        <Button label="Try again" variant="outline" onPress={retry} />
      </View>
    );
  return pending ? (
    <Text
      accessibilityLiveRegion="polite"
      className="py-xl font-body text-body text-text-secondary"
    >
      Loading your history… The server may take a moment.
    </Text>
  ) : null;
}
