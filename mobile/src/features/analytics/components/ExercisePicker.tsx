import { useExerciseNames } from "@/features/exercises/api/useExerciseNames";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { FlatList, Modal, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getExercises } from "@/features/exercises/api/exercise";
import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import type { ExerciseRead } from "@/features/exercises/types/exercise";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { APP_BACKGROUND } from "@/theme/tokens";
import { Empty, QueryNotice } from "./AnalyticsControls";
export function ExerciseList({
  onSelect,
}: {
  onSelect: (exercise: ExerciseRead) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const exerciseName = useExerciseNames();
  const { language } = useLanguage();
  const params = { name: search.trim(), language, limit: 30 };
  const query = useInfiniteQuery({
    queryKey: exerciseKeys.infiniteList(params),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getExercises({ ...params, offset: pageParam }),
    getNextPageParam: (page, pages) =>
      page.length === 30 ? pages.length * 30 : undefined,
  });
  const exercises = query.data?.pages.flat() ?? [];
  return (
    <FlatList
      data={exercises}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="pb-xl"
      ListHeaderComponent={
        <View className="gap-md pb-lg">
          <TextField
            label={t("Find an exercise")}
            placeholder={t("Search by name")}
            value={search}
            onChangeText={setSearch}
          />
          <QueryNotice
            pending={query.isPending}
            error={query.error}
            retry={() => void query.refetch()}
          />
        </View>
      }
      renderItem={({ item, index }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(item)}
          className={`min-h-14 flex-row items-center gap-md py-lg ${index < exercises.length - 1 ? "border-b border-border" : ""}`}
        >
          <View className="flex-1 gap-xs">
            <Text className="font-body-semibold text-body text-text-primary">
              {exerciseName(item.id, item.name)}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {t(`exercise.${item.muscle_group}`)} ·{" "}
              {t(`exercise.${item.equipment}`)}
            </Text>
          </View>
          <Icon
            name="chevron-right"
            size={16}
            className="text-text-secondary"
          />
        </Pressable>
      )}
      ListEmptyComponent={
        !query.isPending && !query.error ? (
          <Empty
            title={t("No exercises found")}
            message={t("Try a different name.")}
          />
        ) : undefined
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <View className="pt-lg">
            <Button
              label={
                query.isFetchingNextPage
                  ? t("Loading…")
                  : t("Load more exercises")
              }
              disabled={query.isFetchingNextPage}
              variant="outline"
              onPress={() => void query.fetchNextPage()}
            />
          </View>
        ) : undefined
      }
    />
  );
}
export function ExercisePicker({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: ExerciseRead) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const pendingSelection = useRef<ExerciseRead | null>(null);

  function select(exercise: ExerciseRead) {
    if (Platform.OS !== "ios") {
      onSelect(exercise);
      return;
    }
    if (pendingSelection.current) return;
    // Wait for the native modal to close before presenting the set editor.
    pendingSelection.current = exercise;
    setVisible(false);
  }

  return (
    <Modal
      animationType="slide"
      backdropColor={APP_BACKGROUND}
      visible={visible}
      onRequestClose={onClose}
      onDismiss={() => {
        const exercise = pendingSelection.current;
        pendingSelection.current = null;
        if (exercise) onSelect(exercise);
      }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: APP_BACKGROUND }}>
        <View className="flex-1 bg-bg p-lg">
          <View className="flex-row items-center justify-between pb-lg">
            <Text
              accessibilityRole="header"
              className="flex-1 font-body-bold text-title leading-10 text-text-primary"
            >
              {t("Add exercise")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="min-h-12 justify-center px-md"
            >
              <Text className="font-body-semibold text-body text-text-primary">
                {t("Cancel")}
              </Text>
            </Pressable>
          </View>
          <ExerciseList onSelect={select} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
