import { sessionKeys } from "@/features/workout/api/queryKeys";
import { Button } from "@/components/ui/Button";
import { loadErrorMessage } from "@/shared/api/loadError";
import { SessionStatsSkeleton } from "./TodaySkeletons";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { WEIGHT_UNIT } from "@/features/workout/utils/experience";
import { Icon } from "@/components/ui/Icon";
import { getSessionDetails } from "@/features/workout/api/session";
import type { SessionRead } from "@/features/workout/types/session";
import { InfoCard } from "@/features/today/components/InfoCard";

type LastSessionCardProps = {
  session?: SessionRead;
  routineName?: string;
};

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "—";
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  const diffMins = Math.max(1, Math.round((endMs - startMs) / 60000));

  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatSessionDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function LastSessionCard({
  session,
  routineName,
}: LastSessionCardProps) {
  const {
    data: detail,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: sessionKeys.detail(session?.id),
    queryFn: () => getSessionDetails(session!.id),
    enabled: !!session?.id,
  });

  const stats = useMemo(() => {
    const sets = detail?.sets ?? [];
    const totalSets = sets.length;
    const uniqueExercises = new Set(sets.map((s) => s.exercise_id)).size;
    const totalVolume = Math.round(
      sets.reduce((acc, s) => acc + s.weight * s.reps, 0),
    );
    const duration = session
      ? formatDuration(session.started_at, session.ended_at)
      : "—";

    return {
      totalSets,
      uniqueExercises,
      totalVolume,
      duration,
    };
  }, [detail, session]);

  if (!session) {
    return (
      <InfoCard
        title="No sessions yet"
        description="Your completed workouts will appear here."
      />
    );
  }

  return (
    <View className="gap-lg py-sm">
      {/* Intestazione: Nome Routine + Data */}
      <View className="flex-row items-start justify-between gap-md">
        <View className="flex-1 gap-xs">
          <Text className="font-body-bold text-xl text-text-primary">
            {routineName || "Workout Session"}
          </Text>
          <Text className="font-body text-caption text-text-secondary">
            {formatSessionDate(session.date)}
          </Text>
        </View>

        <View className="flex-row items-center gap-xs py-xs">
          <Icon name="stopwatch" size={12} className="text-accent" />
          <Text className="font-numeric-bold text-caption text-text-primary">
            {stats.duration}
          </Text>
        </View>
      </View>

      {/* Statistiche della sessione */}
      {error ? (
        <View className="gap-sm">
          <Text className="font-body text-caption text-text-secondary">
            {loadErrorMessage(error)}
          </Text>
          <Button
            variant="outline"
            label={isFetching ? "Retrying…" : "Try again"}
            disabled={isFetching}
            onPress={() => {
              void refetch();
            }}
          />
        </View>
      ) : isLoading ? (
        <SessionStatsSkeleton />
      ) : (
        <View className="flex-row gap-sm pt-xs">
          <View className="flex-1 gap-xs">
            <Text className="font-numeric-bold text-xl text-text-primary">
              {stats.uniqueExercises}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {stats.uniqueExercises === 1 ? "exercise" : "exercises"}
            </Text>
          </View>

          <View className="flex-1 gap-xs">
            <Text className="font-numeric-bold text-xl text-text-primary">
              {stats.totalSets}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {stats.totalSets === 1 ? "set" : "sets"}
            </Text>
          </View>

          <View className="flex-1 gap-xs">
            <Text className="font-numeric-bold text-xl text-text-primary">
              {stats.totalVolume.toLocaleString()}
              <Text className="font-body text-caption text-text-secondary">
                {" "}
                {WEIGHT_UNIT}
              </Text>
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              volume
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
