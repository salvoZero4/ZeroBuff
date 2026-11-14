import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { deleteWeight, getWeights } from "@/features/weight/api/weight";
import { weightKeys } from "@/features/weight/api/queryKeys";
import type { WeightLogRead } from "@/features/weight/types/weight";
import { WEIGHT_UNIT } from "@/features/workout/utils/experience";
import {
  dateLabel,
  numberLabel,
  periodStart,
  weeklyWeightAverages,
  type Period,
} from "../utils/progress";
import { Choices, Empty, PeriodControl, QueryNotice } from "./AnalyticsControls";
import { ProgressChart } from "./ProgressChart";
import { WeightEntryEditor } from "./WeightEntryEditor";

const CHART_VIEWS = ["Weekly average", "Daily"] as const;
type ChartView = (typeof CHART_VIEWS)[number];

export function BodyWeightHistory() {
  const [period, setPeriod] = useState<Period>("3M");
  const [chartView, setChartView] = useState<ChartView>("Weekly average");
  const [editor, setEditor] = useState<{ log: WeightLogRead | null } | null>(
    null,
  );
  const [removing, setRemoving] = useState<WeightLogRead | null>(null);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: weightKeys.list(),
    queryFn: () => getWeights(),
  });
  const points = useMemo(
    () =>
      (query.data ?? [])
        .map((log) => ({ id: log.id, date: log.date, value: log.weight }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [query.data],
  );
  const start = periodStart(period);
  const visible = (query.data ?? [])
    .filter((log) => log.date >= start)
    .sort((a, b) => b.date.localeCompare(a.date));
  const weekly = chartView === "Weekly average";
  const weeks = useMemo(() => weeklyWeightAverages(points), [points]);
  const chartPoints = weekly
    ? weeks
        .filter((week) => week.endDate >= start)
        .map((week) => ({
          ...week,
          label: `${dateLabel(week.date)} – ${dateLabel(week.endDate)} · ${week.count} ${week.count === 1 ? "weigh-in" : "weigh-ins"}`,
        }))
    : points.filter((point) => point.date >= start);
  const change =
    chartPoints.length > 1
      ? chartPoints[chartPoints.length - 1].value - chartPoints[0].value
      : null;
  const remove = useMutation({
    mutationFn: deleteWeight,
    onSuccess: () => setRemoving(null),
    onError: (err: Error) => {
      setRemoving(null);
      Alert.alert("Could not delete weight", err.message);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: weightKeys.all });
    },
  });
  return (
    <>
      <FlatList
        data={visible}
        keyExtractor={(log) => log.id}
        contentContainerClassName="pb-xl"
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View className="gap-md">
            <PeriodControl value={period} onChange={setPeriod} />
            <QueryNotice
              pending={query.isPending}
              error={query.error}
              retry={() => void query.refetch()}
            />
            {query.data && points.length > 0 && (
              <>
                <Choices
                  values={CHART_VIEWS}
                  value={chartView}
                  onChange={setChartView}
                />
                {weekly && (
                  <Text className="font-body text-caption text-text-secondary">
                    Monday to Sunday · average of logged weights
                  </Text>
                )}
                <ProgressChart
                  key={chartView}
                  points={chartPoints}
                  unit={WEIGHT_UNIT}
                  pointName={weekly ? "weekly average" : "measurement"}
                />
                {change !== null && (
                  <Text className="font-body text-sm text-text-secondary">
                    Period change: {change > 0 ? "+" : ""}
                    {numberLabel(change)} {WEIGHT_UNIT} ·{" "}
                    {weekly
                      ? "first to last weekly average"
                      : "first to last recorded weight"}
                  </Text>
                )}
              </>
            )}
            <Button
              label="Log weight"
              icon="plus"
              onPress={() => setEditor({ log: null })}
            />
            <View className="flex-row flex-wrap items-center justify-between gap-sm pb-sm pt-lg">
              <Text className="font-body-semibold text-xl text-text-primary">
                Measurements
              </Text>
              {query.data && !query.error && (
                <Text className="font-body text-caption text-text-secondary">
                  {visible.length} in this period
                </Text>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center border-b border-border">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit weight from ${dateLabel(item.date)}`}
              onPress={() => setEditor({ log: item })}
              className="min-h-14 flex-1 flex-row flex-wrap items-center justify-between gap-md py-lg"
            >
              <Text className="font-body text-sm text-text-secondary">
                {dateLabel(item.date)}
              </Text>
              <Text className="font-numeric text-xl text-text-primary">
                {numberLabel(item.weight)} {WEIGHT_UNIT}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete weight from ${dateLabel(item.date)}`}
              onPress={() => setRemoving(item)}
              className="min-h-12 min-w-12 items-center justify-center"
            >
              <Icon name="trash" size={16} className="text-text-secondary" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          !query.isPending && !query.error ? (
            <Empty
              title="No measurements here yet"
              message="Log your body weight or choose a longer period to see your trend."
            />
          ) : undefined
        }
      />
      {editor && (
        <WeightEntryEditor
          existing={editor.log}
          onClose={() => setEditor(null)}
        />
      )}
      <ConfirmModal
        visible={!!removing}
        title="Delete measurement?"
        description={`Remove the weight recorded on ${removing ? dateLabel(removing.date) : ""}? Your trend will update.`}
        isDestructive
        isPending={remove.isPending}
        confirmLabel={remove.isPending ? "Deleting…" : "Delete weight"}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
