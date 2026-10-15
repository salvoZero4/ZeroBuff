import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getRoutines, type RoutineListRead } from "@/utils/api/routines";
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
    queryKey: ["routines"],
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
          {/* Header */}
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

          {/* Lista delle routine o Stato vuoto */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-sm pb-md"
          >
            {!isLoading && routines.length > 0 ? (
              <View className="overflow-hidden rounded-md border border-border bg-surface-raised">
                {routines.map((routine, index) => {
                  const isLast = index === routines.length - 1;
                  return (
                    <Pressable
                      key={routine.id}
                      accessibilityRole="button"
                      onPress={() => {
                        onClose();
                        onSelectRoutine(routine.id);
                      }}
                      className={`flex-row items-center justify-between p-lg active:bg-surface ${
                        !isLast ? "border-b border-border" : ""
                      }`}
                    >
                      <View className="flex-1 gap-xs pr-sm">
                        <Text className="font-body-bold text-body text-text-primary">
                          {routine.name}
                        </Text>
                        <Text
                          className="font-body text-caption text-text-secondary"
                          numberOfLines={1}
                        >
                          {routine.muscle_groups
                            .map((m) => m.replace(/_/g, " "))
                            .join(" • ")}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-numeric-bold text-body text-accent">
                          {routine.exercises_count}
                        </Text>
                        <Text className="font-body text-[10px] text-text-secondary">
                          exercises
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : !isLoading && routines.length === 0 ? (
              <View className="items-center gap-md py-xl px-lg rounded-md border border-border bg-surface-raised">
                <Text className="text-center font-body-bold text-body text-text-primary">
                  No routines found
                </Text>
                <Text className="text-center font-body text-caption text-text-secondary leading-5">
                  You haven't created any routines yet. Let's build your first
                  workout routine to get started.
                </Text>
                <Button label="Create routine" onPress={handleCreateNew} />
              </View>
            ) : null}
          </ScrollView>

          {/* Se ci sono routine, aggiungiamo anche un tasto in basso per crearne una nuova al volo */}
          {routines.length > 0 ? (
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
