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
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: sessionKeys.loggedExercises(),
    queryFn: getLoggedExercises,
  });
  const exercises = (query.data ?? []).filter((exercise) =>
    exercise.name.toLowerCase().includes(search.trim().toLowerCase()),
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
            label="Find an exercise"
            placeholder="Search by name"
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
          name={item.name}
          isLast={index === exercises.length - 1}
          onPress={() => onSelect(item)}
        />
      )}
      ListEmptyComponent={
        !query.isPending && !query.error ? (
          <Empty
            title={
              query.data?.length
                ? "No exercises found"
                : "No exercise history yet"
            }
            message={
              query.data?.length
                ? "Try a different name."
                : "Complete a workout with recorded sets to see exercise progress."
            }
          />
        ) : undefined
      }
    />
  );
}
