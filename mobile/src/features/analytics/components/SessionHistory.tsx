import { useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SelectPickerModal } from "@/components/ui/SelectPickerModal";
import { deleteSessionApi } from "@/features/workout/api/session";
import type { SessionRead } from "@/features/workout/types/session";
import {
  clearActiveWorkout,
  useActiveWorkoutStore,
} from "@/features/workout/store/activeWorkoutStore";
import { routineKeys } from "@/features/routines/api/queryKeys";
import { WEIGHT_UNIT } from "@/features/workout/utils/experience";
import { getRoutineStats } from "../api/analytics";
import {
  useHistory,
  useRoutineNames,
  useRefreshTraining,
} from "../hooks/useAnalytics";
import {
  dateLabel,
  numberLabel,
  periodStart,
  type Period,
} from "../utils/progress";
import { Empty, PeriodControl, QueryNotice } from "./AnalyticsControls";
import { SessionActionsModal } from "./SessionActionsModal";

function RoutineComparison({ id }: { id: string }) {
  const query = useQuery({
    queryKey: routineKeys.stats(id),
    queryFn: () => getRoutineStats(id),
  });
  return (
    <View className="gap-sm border-b border-border py-lg">
      <Text className="font-body-semibold text-body text-text-primary">
        Latest routine comparison
      </Text>
      <Text className="font-body text-caption text-text-secondary">
        Latest top-set loads across workouts containing these exercises ·
        independent of the history filter
      </Text>
      <QueryNotice
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.exercises_stats.map((item) => (
        <View key={item.exercise_id} className="gap-xs py-sm">
          <Text className="font-body text-sm text-text-primary">
            {item.name}
          </Text>
          <Text className="font-numeric text-xl text-text-primary">
            {item.previous_weight === null
              ? "—"
              : numberLabel(item.previous_weight)}{" "}
            →{" "}
            {item.latest_weight === null
              ? "—"
              : numberLabel(item.latest_weight)}{" "}
            {WEIGHT_UNIT}
            {item.percentage_improvement !== null
              ? `  (${item.percentage_improvement > 0 ? "+" : ""}${numberLabel(item.percentage_improvement)}%)`
              : ""}
          </Text>
          {item.latest_date && (
            <Text className="font-body text-caption text-text-secondary">
              {item.previous_date ? `${dateLabel(item.previous_date)} → ` : ""}
              {dateLabel(item.latest_date)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
export function SessionHistory() {
  const sessions = useHistory(),
    routines = useRoutineNames(),
    refresh = useRefreshTraining();
  const activeId = useActiveWorkoutStore((state) => state.session?.sessionId);
  const [period, setPeriod] = useState<Period>("All");
  const [routine, setRoutine] = useState("all");
  const [showComparison, setShowComparison] = useState(false);
  const [picker, setPicker] = useState(false);
  const [actions, setActions] = useState<SessionRead | null>(null);
  const [removing, setRemoving] = useState<SessionRead | null>(null);
  const remove = useMutation({
    mutationFn: deleteSessionApi,
    onSuccess: (_, id) => {
      if (id === activeId) clearActiveWorkout();
      setRemoving(null);
    },
    onError: (error: Error) => {
      setRemoving(null);
      Alert.alert("Could not delete session", error.message);
    },
    onSettled: () => {
      void refresh();
    },
  });
  const names = new Map(routines.data?.map((r) => [r.id, r.name]));
  const data = (sessions.data ?? [])
    .filter(
      (s) =>
        s.date >= periodStart(period) &&
        (routine === "all" ||
          (routine === "custom" ? !s.routine_id : s.routine_id === routine)),
    )
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
  function openSession(id: string) {
    router.push({
      pathname: "/session/[sessionId]",
      params: { sessionId: id },
    });
  }
  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(s) => s.id}
        showsVerticalScrollIndicator={false}
        refreshing={sessions.isRefetching}
        onRefresh={() => {
          void sessions.refetch();
          void routines.refetch();
        }}
        contentContainerClassName="pb-xl"
        ListHeaderComponent={
          <View className="gap-md pb-sm">
            <PeriodControl value={period} onChange={setPeriod} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setPicker(true)}
              accessibilityLabel="Filter sessions by routine"
              accessibilityState={{ expanded: picker }}
              className="min-h-12 flex-row items-center justify-between gap-md rounded-sm bg-surface px-md"
            >
              <Text className="flex-1 font-body text-sm text-text-primary">
                {routine === "all"
                  ? "All routines"
                  : routine === "custom"
                    ? "Custom workouts"
                    : (names.get(routine) ?? "Routine")}
              </Text>
              <Icon
                name="chevron-down"
                size={14}
                className="text-text-secondary"
              />
            </Pressable>
            <QueryNotice
              pending={sessions.isPending || routines.isPending}
              error={sessions.error || routines.error}
              retry={() => {
                void sessions.refetch();
                void routines.refetch();
              }}
            />
            {routine !== "all" && routine !== "custom" && (
              <View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showComparison }}
                  onPress={() => setShowComparison(!showComparison)}
                  className="min-h-12 flex-row items-center justify-between gap-md"
                >
                  <Text className="flex-1 font-body-semibold text-sm text-text-primary">
                    Latest routine comparison
                  </Text>
                  <Icon
                    name={showComparison ? "chevron-up" : "chevron-down"}
                    size={14}
                    className="text-text-secondary"
                  />
                </Pressable>
                {showComparison && <RoutineComparison id={routine} />}
              </View>
            )}
            {sessions.data && (
              <Text className="font-body text-caption text-text-secondary">
                {data.length} sessions
                {period !== "All" ? " in this period" : " in your history"}
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const month = item.date.slice(0, 7),
            previousMonth = index > 0 ? data[index - 1].date.slice(0, 7) : "";
          const duration = item.ended_at
            ? Math.max(
                0,
                Math.round(
                  (Date.parse(item.ended_at) - Date.parse(item.started_at)) /
                    60000,
                ),
              )
            : null;
          return (
            <View>
              {month !== previousMonth && (
                <Text className="pb-sm font-body-semibold text-sm text-text-secondary">
                  {new Date(`${month}-01T12:00:00`).toLocaleDateString(
                    "en-GB",
                    { month: "long", year: "numeric" },
                  )}
                </Text>
              )}
              <View
                className={`flex-row items-center ${data[index + 1]?.date.slice(0, 7) === month ? "border-b border-border" : ""}`}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openSession(item.id)}
                  className="min-h-14 flex-1 gap-xs py-lg pr-md"
                >
                  <Text className="font-body-semibold text-body text-text-primary">
                    {item.routine_id
                      ? (names.get(item.routine_id) ?? "Workout")
                      : "Custom workout"}
                  </Text>
                  <Text className="font-body text-caption text-text-secondary">
                    {dateLabel(item.date)}
                    {duration !== null
                      ? ` · ${duration} min`
                      : ` · ${item.status === "paused" ? "Paused" : "In progress"}`}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Session actions for ${dateLabel(item.date)}`}
                  className="min-h-12 min-w-12 items-center justify-center"
                  onPress={() => setActions(item)}
                >
                  <Icon
                    name="ellipsis"
                    size={20}
                    className="text-text-secondary"
                  />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !sessions.isPending && !sessions.error ? (
            <Empty
              title="No sessions here yet"
              message={
                sessions.data?.length
                  ? "Try another period or routine."
                  : "Your workouts will appear here after you start training."
              }
            />
          ) : undefined
        }
      />
      <SelectPickerModal
        visible={picker}
        title="Filter by routine"
        options={[
          { label: "All routines", value: "all" },
          ...(routines.data ?? []).map((r) => ({ label: r.name, value: r.id })),
        ]}
        selectedValues={[routine]}
        onConfirm={(values) => {
          setRoutine(values[0] ?? "all");
          setShowComparison(false);
        }}
        onClose={() => setPicker(false)}
      />
      <SessionActionsModal
        visible={actions !== null}
        date={actions ? dateLabel(actions.date) : ""}
        onClose={() => setActions(null)}
        onView={() => {
          if (actions) openSession(actions.id);
          setActions(null);
        }}
        onDelete={() => {
          setRemoving(actions);
          setActions(null);
        }}
      />
      <ConfirmModal
        visible={!!removing}
        title="Delete session?"
        description={`The session from ${removing ? dateLabel(removing.date) : ""} and all its sets will be permanently removed. Its statistics will update too.`}
        isDestructive
        isPending={remove.isPending}
        confirmLabel={remove.isPending ? "Deleting…" : "Delete session"}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
