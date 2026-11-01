import { Pressable, Text, TextInput, View } from "react-native";
import { Icon } from "@/components/ui/Icon";

export type ActiveSetLog = {
  setNumber: number;
  weight: string;
  reps: string;
  rir: string; // opzionale
  completed: boolean;
};

export type PreviousSet = {
  weight: number;
  reps: number;
  date: string;
};

type WorkoutSetRowProps = {
  set: ActiveSetLog;
  previousSet: PreviousSet | null;
  isLast: boolean;
  onUpdate: (changes: Partial<ActiveSetLog>) => void;
  onToggleComplete: () => void;
  onRemove?: () => void;
};

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function WorkoutSetRow({
  set,
  previousSet,
  isLast,
  onUpdate,
  onToggleComplete,
  onRemove,
}: WorkoutSetRowProps) {
  const prevWeight = previousSet?.weight ?? null;
  const prevReps = previousSet?.reps ?? null;
  const weightNum = Number.parseFloat(set.weight.replace(",", "."));
  const repsNum = Number.parseInt(set.reps, 10);
  const prevVolume = (prevWeight ?? 0) * (prevReps ?? 0);
  const volumeNum = weightNum * repsNum;

  let trend: "up" | "down" | "equal" | null = null;
  if (
    prevWeight !== null &&
    prevReps !== null &&
    Number.isFinite(weightNum) &&
    Number.isFinite(repsNum)
  ) {
    // Weight is the primary driver: heavier is always progression, even with
    // fewer reps. Otherwise volume (weight × reps) decides, so a lighter set
    // with enough extra reps still counts as progression. Bodyweight sets
    // (weight 0) have no volume: reps are the metric.
    const isBodyweight = weightNum === 0 && prevWeight === 0;
    if (weightNum > prevWeight) trend = "up";
    else if (isBodyweight) {
      if (repsNum > prevReps) trend = "up";
      else if (repsNum < prevReps) trend = "down";
      else trend = "equal";
    } else if (volumeNum > prevVolume) trend = "up";
    else if (weightNum < prevWeight || volumeNum < prevVolume) trend = "down";
    else trend = "equal";
  }

  const trendStyle =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-danger"
        : "text-text-secondary";
  const trendIcon =
    trend === "up"
      ? "arrow-trend-up"
      : trend === "down"
        ? "arrow-trend-down"
        : "minus";

  return (
    <View
      className={`w-full self-center flex-col gap-sm rounded-lg border p-lg ${
        set.completed
          ? "border-accent/30 bg-surface-raised"
          : "border-border bg-surface"
      }`}
    >
      {/* Header: set number + fixed-size slot (keeps every card the same height) */}
      <View className="flex-row justify-between items-start">
        <Text className="font-numeric-bold text-lg text-text-primary">
          Set {set.setNumber}
        </Text>
        <View className="h-10 w-10 items-center justify-center">
          {isLast && onRemove && !set.completed ? (
            <Pressable
              accessibilityLabel={`Remove set ${set.setNumber}`}
              accessibilityRole="button"
              onPress={onRemove}
              className="h-10 w-10 items-center justify-center rounded-sm border border-danger/40 bg-danger/10 active:bg-danger/20"
            >
              <Icon name="trash" size={16} className="text-danger" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Weight, Reps and RIR on the same row */}
      <View className="flex-row gap-xs">
        {/* Weight */}
        <View className="flex-1 min-w-0">
          <Text className="text-caption text-text-secondary uppercase tracking-wider">
            Weight
          </Text>
          <View className="flex-row items-end rounded-sm border border-border bg-surface-raised px-xs">
            <TextInput
              accessibilityLabel={`Set ${set.setNumber} weight`}
              keyboardType="decimal-pad"
              value={set.weight}
              placeholder="0"
              placeholderTextColor="#737373"
              onChangeText={(weight) => onUpdate({ weight })}
              className="flex-1 min-w-0 min-h-14 text-center font-numeric text-2xl text-text-primary"
            />
            <Text className="font-body text-base text-text-secondary mr-xs">
              kg
            </Text>
          </View>
        </View>

        {/* Reps */}
        <View className="flex-1 min-w-0">
          <Text className="text-caption text-text-secondary uppercase tracking-wider">
            Reps
          </Text>
          <View className="flex-row items-end rounded-sm border border-border bg-surface-raised px-xs">
            <TextInput
              accessibilityLabel={`Set ${set.setNumber} reps`}
              keyboardType="number-pad"
              value={set.reps}
              placeholder="0"
              placeholderTextColor="#737373"
              onChangeText={(reps) => onUpdate({ reps })}
              className="flex-1 min-w-0 min-h-14 text-center font-numeric text-2xl text-text-primary"
            />
            <Text className="font-body text-base text-text-secondary mr-xs">
              reps
            </Text>
          </View>
        </View>

        {/* RIR */}
        <View className="w-20">
          <Text className="text-caption text-text-secondary uppercase tracking-wider">
            RIR
          </Text>
          <View className="flex-row items-end rounded-sm border border-border bg-surface-raised px-xs">
            <TextInput
              accessibilityLabel={`Set ${set.setNumber} RIR`}
              keyboardType="number-pad"
              value={set.rir}
              placeholder="-"
              placeholderTextColor="#737373"
              onChangeText={(rir) => onUpdate({ rir })}
              className="flex-1 min-w-0 min-h-14 text-center font-numeric text-lg text-text-primary"
            />
            <Text className="font-body text-caption text-text-secondary mr-xs">
              rir
            </Text>
          </View>
        </View>
      </View>

      {/* Last session table left, checkbox right */}
      <View className="flex-row items-center justify-between gap-sm py-lg">
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-xs">
            <Text className="text-caption text-text-secondary uppercase tracking-wider">
              Last session
            </Text>
            {previousSet ? (
              <Icon name={trendIcon} size={14} className={trendStyle} />
            ) : null}
          </View>
          {previousSet ? (
            <View className="mt-xs">
              <View className="flex-row">
                <Text className="flex-1 text-caption text-text-secondary uppercase tracking-wider">
                  Weight
                </Text>
                <Text className="flex-1 text-caption text-text-secondary uppercase tracking-wider">
                  Reps
                </Text>
                <Text className="flex-1 text-caption text-text-secondary uppercase tracking-wider">
                  Volume
                </Text>
              </View>
              <View className="flex-row">
                <Text className={`flex-1 font-numeric text-base ${trendStyle}`}>
                  {formatValue(previousSet.weight)} kg
                </Text>
                <Text className={`flex-1 font-numeric text-base ${trendStyle}`}>
                  {previousSet.reps}
                </Text>
                <Text className={`flex-1 font-numeric text-base ${trendStyle}`}>
                  {formatValue(previousSet.weight * previousSet.reps)} kg
                </Text>
              </View>
            </View>
          ) : (
            <Text className="font-numeric text-base text-text-secondary">
              —
            </Text>
          )}
        </View>

        {/* Checkbox */}
        <Pressable
          accessibilityLabel={
            set.completed
              ? `Unmark set ${set.setNumber} as done`
              : `Mark set ${set.setNumber} as done`
          }
          accessibilityRole="checkbox"
          accessibilityState={{ checked: set.completed }}
          onPress={onToggleComplete}
          className={`h-10 w-10 items-center justify-center rounded-md border-2 ${
            set.completed
              ? "border-accent bg-accent"
              : "border-text-secondary bg-transparent"
          }`}
        >
          {set.completed ? (
            <Icon name="check" size={24} className="text-on-accent" />
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
