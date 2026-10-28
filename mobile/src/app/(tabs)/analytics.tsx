import { useState } from "react";
import {
  ActivityIndicator,
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
import {
  deleteSessionApi,
  getSessions,
  type SessionRead,
} from "@/utils/api/session";
import { getRoutines, type RoutineListRead } from "@/utils/api/routines";
import {
  clearActiveWorkout,
  useActiveWorkout,
} from "@/utils/stores/activeWorkoutStore";

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

export default function AnalyticsScreen() {
  const queryClient = useQueryClient();
  const activeSession = useActiveWorkout();
  const [sessionToDelete, setSessionToDelete] = useState<SessionRead | null>(
    null,
  );

  // 1. Fetch delle sessioni
  const {
    data: sessions = [],
    isLoading: isSessionsLoading,
    refetch: refetchSessions,
    isRefetching,
  } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => getSessions({ limit: 50 }),
  });

  // 2. Fetch delle routine per i nomi
  const { data: routines = [] } = useQuery({
    queryKey: ["routines"],
    queryFn: () => getRoutines(),
  });

  const routinesMap = new Map<string, string>(
    routines.map((r: RoutineListRead) => [r.id, r.name]),
  );

  // 3. Mutation per cancellare
  const { mutate: handleDeleteSession, isPending: isDeleting } = useMutation({
    mutationFn: async (sessionId: string) => {
      await deleteSessionApi(sessionId);
    },
    onSuccess: (_, deletedSessionId) => {
      // Se la sessione eliminata è quella attiva nello store locale, resettala!
      if (activeSession?.sessionId === deletedSessionId) {
        clearActiveWorkout();
      }

      // Invalida le query per aggiornare lo schermo e lo schedule di oggi
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setSessionToDelete(null);
    },
    onError: (error: any) => {
      setSessionToDelete(null);
      Alert.alert(
        "Errore di eliminazione",
        error?.message || "Impossibile eliminare la sessione dal server.",
      );
    },
  });

  const handleRefresh = async () => {
    try {
      await refetchSessions();
    } catch (error) {
      console.error("Errore durante il refresh delle sessioni:", error);
    }
  };

  if (isSessionsLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#f5f5f5" />
      </View>
    );
  }

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
              subtitle="View your workout history for now..."
            />
          </View>
        }
        renderItem={({ item }) => {
          const routineName = item.routine_id
            ? (routinesMap.get(item.routine_id) ?? "Allenamento Custom")
            : "Allenamento Custom";
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
                        In corso
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="font-body text-caption text-text-secondary">
                  Data: {formatDate(item.date)}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Elimina sessione"
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
              Nessuna sessione trovata
            </Text>
            <Text className="text-center font-body text-caption text-text-secondary">
              Le sessioni d'allenamento completate o in corso appariranno qui.
            </Text>
          </View>
        }
      />

      <ConfirmModal
        visible={sessionToDelete !== null}
        title="Elimina sessione"
        description={`Sei sicuro di voler eliminare la sessione del ${
          sessionToDelete ? formatDate(sessionToDelete.date) : ""
        }? L'azione sbloccherà anche eventuali allenamenti in corso.`}
        confirmLabel={isDeleting ? "Eliminazione..." : "Elimina"}
        cancelLabel="Annulla"
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
