import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { LoadingNotice } from "@/components/ui/ScreenState";
import { ConsistencyGrid } from "@/features/analytics/components/ConsistencyGrid";
import type { useHistory } from "@/features/analytics/hooks/useAnalytics";
import { loadErrorMessage } from "@/shared/api/loadError";

export function ProfileConsistency({
  history,
}: {
  history: ReturnType<typeof useHistory>;
}) {
  if (history.isPending)
    return (
      <Section title="Consistency">
        <LoadingNotice label="Loading your training year…" />
      </Section>
    );

  if (history.error)
    return (
      <Section title="Consistency">
        <Text className="font-body text-caption text-text-secondary">
          {loadErrorMessage(history.error)}
        </Text>
        <Button
          variant="outline"
          label={history.isFetching ? "Retrying…" : "Try again"}
          disabled={history.isFetching}
          onPress={() => void history.refetch()}
        />
      </Section>
    );

  return (
    <View className="gap-sm">
      <ConsistencyGrid
        sessions={history.data}
        mode="year"
        showWeekdayLabels
        framed={false}
      />
      {!history.data.some((session) => session.status === "completed") && (
        <Text className="font-body text-caption text-text-secondary">
          Your completed workouts will appear here.
        </Text>
      )}
    </View>
  );
}
