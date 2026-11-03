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
import {
  deleteRoutine,
  getRoutines,
} from "@/features/routines/api/routines";
import type { RoutineListRead } from "@/features/routines/types/routine";
import { RoutineCard } from "@/features/routines/components/RoutineCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Section } from "@/components/ui/Section";
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
    },
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

  const totalMovements = routines.reduce(
    (total, routine) => total + routine.exercises_count,
    0,
  );

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
        <View className="flex-row items-end justify-between gap-md">
          <ScreenHeader title="Your routines" subtitle="Plan your workouts" />
          <IconButton
            variant="accent"
            icon="plus"
            iconSize={24}
            label="Create a new routine"
            onPress={() => openRoutine("new")}
          />
        </View>

        <View className="flex-row gap-sm">
          <View className="flex-1 gap-xs rounded-sm border border-border bg-surface p-md">
            <Text className="font-numeric-bold text-title text-accent">
              {routines.length}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {routines.length === 1 ? "routine" : "routines"}
            </Text>
          </View>
          <View className="flex-1 gap-xs rounded-sm border border-border bg-surface p-md">
            <Text className="font-numeric-bold text-title text-text-primary">
              {totalMovements}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              movements
            </Text>
          </View>
        </View>

        {/* Lista Routine */}
        {routines.length > 0 ? (
          <Section title="All routines">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                name={routine.name}
                muscleGroups={routine.muscle_groups.map((m) =>
                  m.replace(/_/g, " "),
                )}
                exerciseCount={routine.exercises_count}
                onPress={() => openRoutine(routine.id)}
                onDelete={() => setRoutineToDelete(routine)}
              />
            ))}
          </Section>
        ) : (
          <View className="gap-md rounded-md border border-border bg-surface p-xl">
            <View className="items-center gap-xs">
              <Text className="font-body-bold text-xl text-text-primary">
                No routines yet
              </Text>
              <Text className="text-center font-body text-caption leading-5 text-text-secondary">
                Create a routine to keep your next workout ready.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={routineToDelete !== null}
        title="Delete routine"
        description={`Are you sure you want to delete "${routineToDelete?.name}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => {
          if (routineToDelete) {
            handleDeleteRoutine(routineToDelete.id);
          }
        }}
        onCancel={() => setRoutineToDelete(null)}
      />
    </View>
  );
}
