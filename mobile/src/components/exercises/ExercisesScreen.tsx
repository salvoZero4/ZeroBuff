import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import {
  getExercises,
  MUSCLE_GROUPS,
  type ExerciseRead,
  type MuscleGroup,
} from "@/utils/api/exercise";
import { selectExercise } from "@/utils/stores/exercisePickerStore";
import { CreateExerciseModal } from "./CreateExerciseModal";

const PAGE_SIZE = 20;

export function ExercisesScreen() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: [
      "exercises",
      {
        name: debouncedSearch,
        muscle_group: selectedMuscle === "all" ? undefined : selectedMuscle,
      },
    ],
    queryFn: ({ pageParam = 0 }) =>
      getExercises({
        offset: pageParam,
        limit: PAGE_SIZE,
        name: debouncedSearch || undefined,
        muscle_group:
          selectedMuscle === "all"
            ? undefined
            : (selectedMuscle as MuscleGroup),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
  });

  const exercises = useMemo(
    () => data?.pages.flatMap((page) => page) ?? [],
    [data],
  );

  function handleSelect(exercise: ExerciseRead) {
    selectExercise(exercise);
    router.back();
  }

  function handleEndReached() {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }

  return (
    <View className="flex-1 bg-bg px-lg pt-lg">
      {/* Header con ritorno */}
      <View className="flex-row items-center gap-md pb-md">
        <IconButton
          icon="arrow-left"
          label="Back"
          iconSize={18}
          onPress={() => router.back()}
        />
        <View className="flex-1">
          <Text className="font-body-bold text-title text-text-primary">
            Exercises
          </Text>
          <Text className="font-body text-caption text-text-secondary">
            Select a movement for your routine
          </Text>
        </View>
      </View>

      {/* Input di ricerca */}
      <View className="mb-sm">
        <TextInput
          accessibilityLabel="Search exercises"
          placeholder="Search by exercise name..."
          placeholderTextColor="#737373"
          value={search}
          onChangeText={setSearch}
          className="min-h-12 rounded-sm border border-border bg-surface px-md font-body text-body text-text-primary"
        />
      </View>

      {/* Filtri muscolari orizzontali */}
      <View className="mb-md max-h-10">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-xs"
        >
          {["all", ...MUSCLE_GROUPS].map((group) => {
            const isSelected = selectedMuscle === group;
            return (
              <Pressable
                key={group}
                accessibilityRole="button"
                onPress={() => setSelectedMuscle(group)}
                className={`rounded-sm border px-md py-xs capitalize ${
                  isSelected
                    ? "border-accent bg-accent"
                    : "border-border bg-surface"
                }`}
              >
                <Text
                  className={`font-body-semibold text-caption ${
                    isSelected ? "text-on-accent" : "text-text-secondary"
                  }`}
                >
                  {group.replace("_", " ")}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista esercizi */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#E2F163" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center p-lg">
          <Text className="font-body text-body text-danger">
            Unable to load exercises.
          </Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsCreateModalOpen(true)}
              className="mb-md flex-row items-center justify-between rounded-md border border-dashed border-accent/60 bg-surface p-lg active:bg-surface-raised"
            >
              <View className="gap-xs">
                <Text className="font-body-bold text-body text-accent">
                  + Create custom exercise
                </Text>
                <Text className="font-body text-caption text-text-secondary">
                  Add a new movement to the database
                </Text>
              </View>
            </Pressable>
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => handleSelect(item)}
              className={`flex-row items-center justify-between border-x border-border bg-surface p-lg active:bg-surface-raised ${
                index === 0 ? "rounded-t-md border-t" : ""
              } ${
                index === exercises.length - 1
                  ? "rounded-b-md border-b"
                  : "border-b"
              }`}
            >
              <View className="flex-1 gap-xs pr-sm">
                <Text className="font-body-bold text-body text-text-primary">
                  {item.name}
                </Text>
                <Text className="font-body text-caption capitalize text-text-secondary">
                  {item.muscle_group.replace("_", " ")} •{" "}
                  {item.equipment.replace("_", " ")}
                </Text>
              </View>
              <Icon name="plus" size={14} className="text-accent" />
            </Pressable>
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-lg items-center">
                <ActivityIndicator color="#E2F163" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center p-xl">
              <Text className="font-body text-caption text-text-secondary">
                No exercises found matching "{debouncedSearch}"
              </Text>
            </View>
          }
        />
      )}

      <CreateExerciseModal
        visible={isCreateModalOpen}
        initialName={search}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(created) => handleSelect(created)}
      />
    </View>
  );
}
