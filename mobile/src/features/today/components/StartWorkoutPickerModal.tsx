import { routineKeys } from "@/features/routines/api/queryKeys";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getRoutines } from "@/features/routines/api/routines";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { LoadingNotice } from "@/components/ui/ScreenState";
import { loadErrorMessage } from "@/shared/api/loadError";

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
  const insets = useSafeAreaInsets();
  const {
    data: routines = [],
    isPending,
    error,
    isFetching,
    refetch,
  } = useQuery({
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
          accessibilityLabel="Close workout picker"
          className="absolute inset-0"
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          className="max-h-[85%] gap-md rounded-t-lg border-t border-border bg-bg p-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center gap-md">
            <View className="flex-1 gap-xs">
              <Text
                accessibilityRole="header"
                className="font-body-bold text-xl text-text-primary"
              >
                Select workout
              </Text>
              <Text className="font-body text-caption text-text-secondary">
                Choose a routine to start training
              </Text>
            </View>
            <IconButton
              icon="xmark"
              label="Close workout picker"
              variant="bare"
              onPress={onClose}
            />
          </View>
          {error ? (
            <View className="gap-md">
              <Text className="font-body text-caption text-text-secondary">
                {loadErrorMessage(error)}
              </Text>
              <Button
                variant="outline"
                label={isFetching ? "Retrying…" : "Try again"}
                disabled={isFetching}
                onPress={() => void refetch()}
              />
            </View>
          ) : isPending ? (
            <LoadingNotice label="Loading routines…" />
          ) : (
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {routines.length > 0 ? (
                routines.map((routine, index) => {
                  const isEmpty = routine.exercises_count === 0;
                  return (
                    <Pressable
                      key={routine.id}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isEmpty }}
                      disabled={isEmpty}
                      onPress={() => {
                        onClose();
                        onSelectRoutine(routine.id);
                      }}
                      className={`min-h-14 flex-row items-center gap-md py-lg active:bg-surface ${index < routines.length - 1 ? "border-b border-border" : ""} ${isEmpty ? "opacity-50" : ""}`}
                    >
                      <View className="flex-1 gap-xs">
                        <Text className="font-body-semibold text-body text-text-primary">
                          {routine.name}
                        </Text>
                        <Text className="font-body text-caption text-text-secondary">
                          {isEmpty
                            ? "Add exercises to start this workout"
                            : `${routine.exercises_count} ${routine.exercises_count === 1 ? "exercise" : "exercises"}`}
                        </Text>
                      </View>
                      {!isEmpty && (
                        <Icon
                          name="chevron-right"
                          size={14}
                          className="text-text-secondary"
                        />
                      )}
                    </Pressable>
                  );
                })
              ) : (
                <View className="gap-sm py-lg">
                  <Text className="font-body-semibold text-body text-text-primary">
                    No routines yet
                  </Text>
                  <Text className="font-body text-caption text-text-secondary">
                    Create a routine to start your first workout.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
          {!isPending && !error && (
            <Button
              variant={routines.length ? "ghost" : "primary"}
              icon="plus"
              label="Create routine"
              onPress={handleCreateNew}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
