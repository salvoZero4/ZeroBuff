import { routineKeys } from "@/features/routines/api/queryKeys";
import { scheduleKeys } from "@/features/schedule/api/queryKeys";
import { sessionKeys } from "@/features/workout/api/queryKeys";
import { AnalyticsSkeleton } from "@/features/analytics/components/AnalyticsSkeleton";
import { ScreenError } from "@/components/ui/ScreenState";
import { loadErrorMessage } from "@/shared/api/loadError";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { deleteSessionApi, getSessions } from "@/features/workout/api/session";
import type { SessionRead } from "@/features/workout/types/session";
import { getRoutines } from "@/features/routines/api/routines";
import type { RoutineListRead } from "@/features/routines/types/routine";
import {
  clearActiveWorkout,
  useActiveWorkoutStore,
} from "@/features/workout/store/activeWorkoutStore";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function AnalyticsScreen() {
  const queryClient = useQueryClient();
  const activeSessionId = useActiveWorkoutStore(
    (state) => state.session?.sessionId,
  );
  const [sessionToDelete, setSessionToDelete] = useState<SessionRead | null>(
    null,
  );

  // 1. Fetch delle sessioni
  const {
    data: sessions = [],
    isPending: isSessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
    isRefetching,
  } = useQuery({
    queryKey: sessionKeys.list({ limit: 50 }),
    queryFn: () => getSessions({ limit: 50 }),
  });

  // 2. Fetch delle routine per i nomi
  const {
    data: routines = [],
    error: routinesError,
    isPending: routinesPending,
    refetch: refetchRoutines,
  } = useQuery({
    queryKey: routineKeys.list(),
    queryFn: () => getRoutines(),
  });

  const routinesMap = new Map<string, string>(
    routines.map((r: RoutineListRead) => [r.id, r.name]),
  );

  // Delete a session.
  const { mutate: handleDeleteSession, isPending: isDeleting } = useMutation({
    mutationFn: async (sessionId: string) => {
      await deleteSessionApi(sessionId);
    },
    onSuccess: (_, deletedSessionId) => {
      // Reset the local active workout when its server session is deleted.
      if (activeSessionId === deletedSessionId) {
        clearActiveWorkout();
      }

      // Refresh the session history and today's schedule.
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      setSessionToDelete(null);
    },
    onError: (error) => {
      setSessionToDelete(null);
      Alert.alert(
        "Delete failed",
        error instanceof Error
          ? error.message
          : "Could not delete the session from the server.",
      );
    },
  });

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchSessions(), refetchRoutines()]);
    } catch (error) {
      console.error("Failed to refresh sessions:", error);
    }
  };

  if (sessionsError || routinesError)
    return (
      <ScreenError
        title="History couldn’t load"
        message={loadErrorMessage(sessionsError || routinesError)}
        onRetry={handleRefresh}
        busy={isRefetching}
      />
    );
  if (isSessionsLoading || routinesPending) return <AnalyticsSkeleton />;

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-md p-lg pb-xl"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor="#f5f5f5"
          />
        }
        ListHeaderComponent={
          <View className="pb-sm">
            <ScreenHeader
              title="Analytics"
              subtitle="Review your workout history"
            />
          </View>
        }
        renderItem={({ item }) => {
          const routineName = item.routine_id
            ? (routinesMap.get(item.routine_id) ?? "Custom Workout")
            : "Custom Workout";
          const isCompleted = item.status === "completed";

          return (
            <View className="flex-row items-center justify-between rounded-md border border-border bg-surface p-lg">
              <View className="flex-1 gap-xs pr-md">
                <View className="flex-row items-center gap-xs">
                  <Text className="font-body-bold text-lg text-text-primary">
                    {routineName}
                  </Text>
                  {!isCompleted && (
                    <View className="rounded-sm bg-accent/20 px-xs py-2xs">
                      <Text className="font-body-bold text-[10px] uppercase text-accent">
                        In progress
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="font-body text-caption text-text-secondary">
                  Date: {formatDate(item.date)}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Delete session"
                accessibilityRole="button"
                onPress={() => setSessionToDelete(item)}
                className="h-10 w-10 items-center justify-center rounded-sm bg-danger/10 active:bg-danger/20"
              >
                <Icon name="trash" size={16} className="text-danger" />
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center justify-center gap-xs rounded-md border border-border bg-surface p-xl">
            <Text className="font-body-bold text-body text-text-primary">
              No sessions found
            </Text>
            <Text className="text-center font-body text-caption text-text-secondary">
              Completed and in-progress workouts will appear here.
            </Text>
          </View>
        }
      />

      <ConfirmModal
        visible={sessionToDelete !== null}
        title="Delete session"
        description={`Are you sure you want to delete the session from ${
          sessionToDelete ? formatDate(sessionToDelete.date) : ""
        }? This will also unlock any workout in progress.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => {
          if (sessionToDelete) {
            handleDeleteSession(sessionToDelete.id);
          }
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </View>
  );
}
