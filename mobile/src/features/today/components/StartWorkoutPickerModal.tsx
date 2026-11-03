import { routineKeys } from "@/features/routines/api/queryKeys";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getRoutines } from "@/features/routines/api/routines";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

type StartWorkoutPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectRoutine: (routineId: string) => void;
};

export function StartWorkoutPickerModal({
  visible,
  onClose,
  onSelectRoutine,
}: StartWorkoutPickerModalProps) {
  const { data: routines = [], isLoading } = useQuery({
    queryKey: routineKeys.list(),
    queryFn: () => getRoutines(),
    enabled: visible,
  });

  function handleCreateNew() {
    onClose();
    router.push({
      pathname: "/(tabs)/routines/[routineId]",
      params: { routineId: "new" },
    });
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/75">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close modal"
          className="absolute inset-0"
          onPress={onClose}
        />

        <View
          onStartShouldSetResponder={() => true}
          className="max-h-[85%] gap-lg rounded-t-lg border border-border bg-surface p-xl"
        >
          <View className="flex-row items-center justify-between">
            <View className="gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                Select workout
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Choose a routine to start training right now
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

          {isLoading ? (
            <View className="items-center justify-center py-xl">
              <ActivityIndicator color="#f5f5f5" size="small" />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="gap-sm pb-xs"
            >
              {routines.length > 0 ? (
                <View className="gap-xs">
                  {routines.map((routine) => {
                    const isEmpty = routine.exercises_count === 0;
                    return (
                      <Pressable
                        key={routine.id}
                        accessibilityRole="button"
                        disabled={isEmpty}
                        onPress={() => {
                          onClose();
                          onSelectRoutine(routine.id);
                        }}
                        className={`flex-row items-center justify-between rounded-md border p-lg ${
                          isEmpty
                            ? "border-border/40 bg-surface/50 opacity-60"
                            : "border-border bg-surface-raised active:bg-surface"
                        }`}
                      >
                        <View className="flex-1 gap-xs pr-md">
                          <Text
                            className={`font-body-bold text-body ${
                              !isEmpty
                                ? "text-text-primary"
                                : "text-text-disabled"
                            }`}
                          >
                            {routine.name}
                          </Text>

                          {!isEmpty ? (
                            <Text
                              className="font-body text-caption text-text-secondary"
                              numberOfLines={1}
                            >
                              {routine.muscle_groups
                                .map((m) => m.replace(/_/g, " "))
                                .join(" • ")}
                            </Text>
                          ) : (
                            <Text className="font-body text-[11px] italic text-text-disabled">
                              Add exercises to start this workout
                            </Text>
                          )}
                        </View>

                        <View className="items-end gap-2xs">
                          <Text
                            className={`font-numeric-bold text-lg ${
                              !isEmpty ? "text-accent" : "text-text-disabled"
                            }`}
                          >
                            {routine.exercises_count}
                          </Text>
                          <Text
                            className={`font-body text-[10px] ${
                              !isEmpty
                                ? "text-text-secondary"
                                : "text-text-disabled"
                            }`}
                          >
                            {routine.exercises_count === 1
                              ? "exercise"
                              : "exercises"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View className="items-center gap-md rounded-md border border-border bg-surface-raised px-lg py-xl">
                  <Text className="text-center font-body-bold text-body text-text-primary">
                    No routines found
                  </Text>
                  <Text className="text-center font-body text-caption leading-5 text-text-secondary">
                    You haven&apos;t created any routines yet. Let&apos;s build your first
                    workout routine to get started.
                  </Text>
                  <Button label="Create routine" onPress={handleCreateNew} />
                </View>
              )}
            </ScrollView>
          )}

          {!isLoading && routines.length > 0 ? (
            <Button
              variant="outline"
              icon="plus"
              label="Create new routine"
              onPress={handleCreateNew}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
