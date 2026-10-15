import { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { getSessionDetails, type SessionRead } from "@/utils/api/session";
import { InfoCard } from "./InfoCard";

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
  const { data: detail, isLoading } = useQuery({
    queryKey: ["sessions", session?.id],
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
    <Card className="gap-md">
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

        <View className="flex-row items-center gap-xs rounded-sm border border-border bg-surface-raised px-sm py-xs">
          <Icon name="stopwatch" size={12} className="text-accent" />
          <Text className="font-numeric-bold text-caption text-text-primary">
            {stats.duration}
          </Text>
        </View>
      </View>

      {/* Statistiche della sessione */}
      {isLoading ? (
        <View className="py-sm items-center">
          <ActivityIndicator color="#f5f5f5" size="small" />
        </View>
      ) : (
        <View className="flex-row gap-sm pt-xs">
          <View className="flex-1 gap-xs rounded-sm border border-border bg-surface-raised p-md">
            <Text className="font-numeric-bold text-xl text-accent">
              {stats.uniqueExercises}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {stats.uniqueExercises === 1 ? "exercise" : "exercises"}
            </Text>
          </View>

          <View className="flex-1 gap-xs rounded-sm border border-border bg-surface-raised p-md">
            <Text className="font-numeric-bold text-xl text-text-primary">
              {stats.totalSets}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {stats.totalSets === 1 ? "set" : "sets"}
            </Text>
          </View>

          <View className="flex-1 gap-xs rounded-sm border border-border bg-surface-raised p-md">
            <Text className="font-numeric-bold text-xl text-text-primary">
              {stats.totalVolume.toLocaleString()}
              <Text className="font-body text-caption text-text-secondary">
                {" "}
                kg
              </Text>
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              volume
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}
