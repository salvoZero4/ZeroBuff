import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  if (history.isPending)
    return (
      <Section title={t("Consistency")}>
        <LoadingNotice label={t("Loading your training year…")} />
      </Section>
    );

  if (history.error)
    return (
      <Section title={t("Consistency")}>
        <Text className="font-body text-caption text-text-secondary">
          {t(loadErrorMessage(history.error))}
        </Text>
        <Button
          variant="outline"
          label={history.isFetching ? t("Retrying…") : t("Try again")}
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
          {t("Your completed workouts will appear here.")}
        </Text>
      )}
    </View>
  );
}
