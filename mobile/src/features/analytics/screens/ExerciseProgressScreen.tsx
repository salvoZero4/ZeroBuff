import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import { WEIGHT_UNIT } from "@/features/workout/utils/experience";
import { Icon } from "@/components/ui/Icon";
import { getExerciseHistory } from "../api/analytics";
import {
  Choices,
  Empty,
  PeriodControl,
  QueryNotice,
} from "../components/AnalyticsControls";
import { ProgressChart } from "../components/ProgressChart";
import {
  METRICS,
  dateLabel,
  exercisePoints,
  metricValue,
  numberLabel,
  periodStart,
  type Metric,
  type Period,
} from "../utils/progress";
export function ExerciseProgressScreen({
  exerciseId,
  name,
}: {
  exerciseId: string;
  name: string;
}) {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("3M"),
    [metric, setMetric] = useState<Metric>("Load");
  const [comparison, setComparison] = useState<string | null>(null);
  const query = useQuery({
    queryKey: exerciseKeys.history(exerciseId),
    queryFn: () => getExerciseHistory(exerciseId),
    enabled: !!exerciseId,
  });
  const sessions = query.data ?? [];
  const bodyweight =
    sessions.length > 0 &&
    sessions.every((s) => s.sets.every((set) => set.weight === 0));
  const effectiveMetric = bodyweight ? "Reps" : metric;
  const points = exercisePoints(sessions, effectiveMetric, period);
  const visible = sessions
    .filter((s) => s.date >= periodStart(period))
    .sort(
      (a, b) =>
        (b.started_at ?? b.date).localeCompare(a.started_at ?? a.date) ||
        b.session_id.localeCompare(a.session_id),
    );
  const latest = visible[0],
    baseline = visible.find((s) => s.session_id === comparison) ?? visible[1];
  const unit = effectiveMetric === "Reps" ? "reps" : WEIGHT_UNIT;
  function openSession(id: string) {
    router.push({
      pathname: "/session/[sessionId]",
      params: { sessionId: id },
    });
  }
  return (
    <View className="flex-1 bg-bg p-lg">
      <FlatList
        data={visible}
        keyExtractor={(s) => s.session_id}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        ListHeaderComponent={
          <View className="gap-md">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Analytics"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(tabs)/analytics")
              }
              className="min-h-12 min-w-12 justify-center"
            >
              <Icon name="arrow-left" size={20} className="text-text-primary" />
            </Pressable>
            <Text className="font-body-bold text-title text-text-primary">
              {name || "Exercise progress"}
            </Text>
            <Text className="font-body text-sm text-text-secondary">
              Completed sessions. Every recorded rep.
            </Text>
            <QueryNotice
              pending={query.isPending}
              error={query.error}
              retry={() => void query.refetch()}
            />
            <PeriodControl value={period} onChange={setPeriod} />
            {!bodyweight && (
              <Choices values={METRICS} value={metric} onChange={setMetric} />
            )}
            <Text className="font-body text-caption text-text-secondary">
              {effectiveMetric === "Load"
                ? "Highest load recorded in each session"
                : effectiveMetric === "Reps"
                  ? "Most repetitions in a single set"
                  : effectiveMetric === "Volume"
                    ? "Sum of load × reps across all sets"
                    : "Estimated 1RM · Epley formula, not a measured maximum"}
            </Text>
            {query.data && (
              <ProgressChart points={points} unit={unit} onOpen={openSession} />
            )}
            {latest && baseline && (
              <View className="gap-sm border-y border-border py-lg">
                <Text className="font-body-semibold text-body text-text-primary">
                  Latest vs {dateLabel(baseline.date)}
                </Text>
                <Text className="font-numeric text-xl text-text-primary">
                  {numberLabel(metricValue(baseline.sets, effectiveMetric))} →{" "}
                  {numberLabel(metricValue(latest.sets, effectiveMetric))}{" "}
                  {unit}
                </Text>
                <Text className="font-body text-caption text-text-secondary">
                  Change:{" "}
                  {numberLabel(
                    metricValue(latest.sets, effectiveMetric) -
                      metricValue(baseline.sets, effectiveMetric),
                  )}{" "}
                  {unit} · {effectiveMetric}. Compare the sets and RIR below.
                </Text>
              </View>
            )}
            <Text className="pt-lg font-body-semibold text-xl text-text-primary">
              Session history
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="gap-sm border-b border-border py-lg">
            <Pressable
              accessibilityRole="button"
              onPress={() => openSession(item.session_id)}
              className="min-h-12 flex-row items-center justify-between"
            >
              <Text className="font-body-semibold text-body text-text-primary">
                {dateLabel(item.date)}
                {item.session_id === latest?.session_id ? " · Latest" : ""}
              </Text>
              <Icon
                name="chevron-right"
                size={16}
                className="text-text-secondary"
              />
            </Pressable>
            {[...item.sets]
              .sort((a, b) => a.set_number - b.set_number)
              .map((set, index) => (
                <View
                  key={`${set.set_number}-${index}`}
                  className="flex-row flex-wrap justify-between gap-md"
                >
                  <Text className="font-body text-sm text-text-secondary">
                    Set {set.set_number}
                  </Text>
                  <Text className="font-numeric text-xl text-text-primary">
                    {numberLabel(set.weight)} {WEIGHT_UNIT} × {set.reps}
                  </Text>
                  <Text className="font-body text-sm text-text-secondary">
                    RIR {set.rir ?? "—"}
                  </Text>
                </View>
              ))}
            {item.session_id !== latest?.session_id && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: item.session_id === baseline?.session_id,
                }}
                onPress={() => setComparison(item.session_id)}
                className="min-h-12 justify-center"
              >
                <Text className="font-body text-sm text-text-secondary">
                  {item.session_id === baseline?.session_id
                    ? "Comparing with latest"
                    : "Compare with latest"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          !query.isPending && !query.error ? (
            <Empty
              title="No sets in this period"
              message="Choose a longer period or log this exercise in a workout."
            />
          ) : undefined
        }
      />
    </View>
  );
}
