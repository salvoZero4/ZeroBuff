import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getExercises } from "@/features/exercises/api/exercise";
import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import type { ExerciseRead } from "@/features/exercises/types/exercise";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Empty, QueryNotice } from "./AnalyticsControls";
export function ExerciseList({
  onSelect,
}: {
  onSelect: (exercise: ExerciseRead) => void;
}) {
  const [search, setSearch] = useState("");
  const query = useInfiniteQuery({
    queryKey: exerciseKeys.infiniteList({ name: search.trim(), limit: 30 }),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getExercises({ name: search.trim(), limit: 30, offset: pageParam }),
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
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(item)}
          className="min-h-14 flex-row items-center gap-md border-b border-border py-lg"
        >
          <View className="flex-1 gap-xs">
            <Text className="font-body-semibold text-body text-text-primary">
              {item.name}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {item.muscle_group.replaceAll("_", " ")} ·{" "}
              {item.equipment.replaceAll("_", " ")}
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
          <Empty title="No exercises found" message="Try a different name." />
        ) : undefined
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <View className="pt-lg">
            <Button
              label={
                query.isFetchingNextPage ? "Loading…" : "Load more exercises"
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
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg p-lg">
        <View className="flex-row items-center justify-between pb-lg">
          <Text className="font-body-bold text-xl text-text-primary">
            Add exercise
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="min-h-12 justify-center px-md"
          >
            <Text className="font-body-semibold text-body text-text-primary">
              Cancel
            </Text>
          </Pressable>
        </View>
        <ExerciseList onSelect={onSelect} />
      </SafeAreaView>
    </Modal>
  );
}
