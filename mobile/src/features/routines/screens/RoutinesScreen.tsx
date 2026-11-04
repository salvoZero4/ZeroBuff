import { routineKeys } from "@/features/routines/api/queryKeys";
import { scheduleKeys } from "@/features/schedule/api/queryKeys";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteRoutine, getRoutines } from "@/features/routines/api/routines";
import type { RoutineListRead } from "@/features/routines/types/routine";
import { RoutineCard } from "@/features/routines/components/RoutineCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

function openRoutine(routineId: string) {
  router.push({
    pathname: "/(tabs)/routines/[routineId]",
    params: { routineId },
  });
}

export function RoutinesScreen() {
  const queryClient = useQueryClient();
  const [selectedRoutine, setSelectedRoutine] =
    useState<RoutineListRead | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [routineToDelete, setRoutineToDelete] =
    useState<RoutineListRead | null>(null);

  const {
    data: routines = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: routineKeys.list(),
    queryFn: () => getRoutines(),
  });

  const { mutate: handleDeleteRoutine, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteRoutine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routineKeys.all });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      setRoutineToDelete(null);
      setDeleteError(null);
    },
    onError: () =>
      setDeleteError("Could not delete this routine. Please try again."),
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#f5f5f5" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-md bg-bg p-xl">
        <Text className="font-body-bold text-xl text-text-primary">
          Unable to load routines
        </Text>
        <Text className="text-center font-body text-caption text-text-secondary">
          Could not retrieve your routines from the server.
        </Text>
        <Button label="Try again" variant="primary" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-xl"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#f5f5f5"
          />
        }
      >
        <View className="flex-row items-center justify-between gap-md">
          <View className="flex-1">
            <ScreenHeader title="Your routines" subtitle="Plan your workouts" />
          </View>
          <IconButton
            variant="accent"
            icon="plus"
            iconSize={24}
            label="Create a new routine"
            onPress={() => openRoutine("new")}
          />
        </View>

        <Text className="font-body text-caption text-text-secondary">
          {routines.length} {routines.length === 1 ? "routine" : "routines"}
        </Text>

        {/* Lista Routine */}
        {routines.length > 0 ? (
          <View>
            {routines.map((routine, index) => (
              <RoutineCard
                key={routine.id}
                name={routine.name}
                muscleGroups={routine.muscle_groups.map((m) =>
                  m.replace(/_/g, " "),
                )}
                exerciseCount={routine.exercises_count}
                onPress={() => openRoutine(routine.id)}
                isLast={index === routines.length - 1}
                onActions={() => setSelectedRoutine(routine)}
                onDelete={() => {
                  setDeleteError(null);
                  setRoutineToDelete(routine);
                }}
              />
            ))}
          </View>
        ) : (
          <View className="gap-lg py-xl">
            <View className="gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                No routines yet
              </Text>
              <Text className="font-body text-body leading-6 text-text-secondary">
                Create a routine to keep your next workout ready.
              </Text>
            </View>
            <Button
              label="Create routine"
              icon="plus"
              onPress={() => openRoutine("new")}
            />
          </View>
        )}
      </ScrollView>

      <ActionSheet
        visible={selectedRoutine !== null}
        title="Routine actions"
        subtitle={selectedRoutine?.name ?? ""}
        onClose={() => setSelectedRoutine(null)}
        actions={[
          {
            label: "Edit routine",
            icon: "pen-to-square",
            onPress: () => {
              if (selectedRoutine) openRoutine(selectedRoutine.id);
              setSelectedRoutine(null);
            },
          },
          {
            label: "Delete routine",
            icon: "trash",
            destructive: true,
            onPress: () => {
              setDeleteError(null);
              setRoutineToDelete(selectedRoutine);
              setSelectedRoutine(null);
            },
          },
        ]}
      />
      <ConfirmModal
        visible={routineToDelete !== null}
        title="Delete routine"
        isPending={isDeleting}
        description={
          deleteError ??
          `Are you sure you want to delete "${routineToDelete?.name}"? This action cannot be undone.`
        }
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => {
          if (routineToDelete && !isDeleting) {
            handleDeleteRoutine(routineToDelete.id);
          }
        }}
        onCancel={() => setRoutineToDelete(null)}
      />
    </View>
  );
}
