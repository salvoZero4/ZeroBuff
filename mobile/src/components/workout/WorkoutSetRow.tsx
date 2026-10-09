import { Pressable, Text, TextInput, View } from "react-native";
import { Icon } from "../ui/Icon";

export type ActiveSetLog = {
  setNumber: number;
  weight: string;
  reps: string;
  rir: string; // opzionale
  completed: boolean;
};

type WorkoutSetRowProps = {
  set: ActiveSetLog;
  onUpdate: (changes: Partial<ActiveSetLog>) => void;
  onToggleComplete: () => void;
};

export function WorkoutSetRow({
  set,
  onUpdate,
  onToggleComplete,
}: WorkoutSetRowProps) {
  return (
    <View
      className={`flex-row items-center gap-xs rounded-sm p-xs ${
        set.completed
          ? "border border-accent/30 bg-surface-raised"
          : "border border-border/40 bg-surface"
      }`}
    >
      {/* Numero serie */}
      <Text className="w-7 text-center font-numeric-bold text-caption text-text-secondary">
        {set.setNumber}
      </Text>

      {/* Input Peso (Kg) */}
      <View className="flex-1 flex-row items-center rounded-sm border border-border bg-surface-raised px-xs">
        <TextInput
          accessibilityLabel={`Set ${set.setNumber} weight`}
          keyboardType="decimal-pad"
          value={set.weight}
          placeholder="0"
          placeholderTextColor="#737373"
          onChangeText={(weight) => onUpdate({ weight })}
          className="min-h-11 flex-1 text-center font-numeric text-body text-text-primary"
        />
        <Text className="font-body text-caption text-text-secondary">kg</Text>
      </View>

      {/* Input Ripetizioni (Reps) */}
      <View className="flex-1 flex-row items-center rounded-sm border border-border bg-surface-raised px-xs">
        <TextInput
          accessibilityLabel={`Set ${set.setNumber} reps`}
          keyboardType="number-pad"
          value={set.reps}
          placeholder="0"
          placeholderTextColor="#737373"
          onChangeText={(reps) => onUpdate({ reps })}
          className="min-h-11 flex-1 text-center font-numeric text-body text-text-primary"
        />
        <Text className="font-body text-caption text-text-secondary">reps</Text>
      </View>

      {/* Input RIR (opzionale) */}
      <View className="w-16 flex-row items-center rounded-sm border border-border bg-surface-raised px-xs">
        <TextInput
          accessibilityLabel={`Set ${set.setNumber} RIR`}
          keyboardType="number-pad"
          value={set.rir}
          placeholder="-"
          placeholderTextColor="#737373"
          onChangeText={(rir) => onUpdate({ rir })}
          className="min-h-11 flex-1 text-center font-numeric text-body text-text-primary"
        />
        <Text className="font-body text-caption text-text-secondary">rir</Text>
      </View>

      {/* Spunta completamento serie */}
      <Pressable
        accessibilityLabel={`Mark set ${set.setNumber} as done`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.completed }}
        onPress={onToggleComplete}
        className={`h-11 w-11 items-center justify-center rounded-sm border ${
          set.completed
            ? "border-accent bg-accent"
            : "border-border bg-surface-raised active:border-accent"
        }`}
      >
        {set.completed ? (
          <Icon name="check" size={16} className="text-on-accent" />
        ) : null}
      </Pressable>
    </View>
  );
}
