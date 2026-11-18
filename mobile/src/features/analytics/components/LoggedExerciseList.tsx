import { useExerciseNames } from "@/features/exercises/api/useExerciseNames";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { TextField } from "@/components/ui/TextField";
import { ExerciseListRow } from "@/features/exercises/components/ExerciseListRow";
import { sessionKeys } from "@/features/workout/api/queryKeys";
import { getLoggedExercises, type LoggedExercise } from "../api/analytics";
import { Empty, QueryNotice } from "./AnalyticsControls";
export function LoggedExerciseList({
  onSelect,
}: {
  onSelect: (exercise: LoggedExercise) => void;
}) {
  const { t } = useTranslation();
  const exerciseName = useExerciseNames();
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: sessionKeys.loggedExercises(),
    queryFn: getLoggedExercises,
  });
  const term = search.trim().toLowerCase();
  const exercises = (query.data ?? []).filter(
    ({ id, name }) =>
      exerciseName(id, name).toLowerCase().includes(term) ||
      name.toLowerCase().includes(term),
  );
  return (
    <FlatList
      data={exercises}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="pb-xl"
      showsVerticalScrollIndicator={false}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
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
        <ExerciseListRow
          name={exerciseName(item.id, item.name)}
          isLast={index === exercises.length - 1}
          onPress={() => onSelect(item)}
        />
      )}
      ListEmptyComponent={
        !query.isPending && !query.error ? (
          <Empty
            title={
              query.data?.length
                ? t("No exercises found")
                : t("No exercise history yet")
            }
            message={
              query.data?.length
                ? t("Try a different name.")
                : t(
                    "Complete a workout with recorded sets to see exercise progress.",
                  )
            }
          />
        ) : undefined
      }
    />
  );
}
