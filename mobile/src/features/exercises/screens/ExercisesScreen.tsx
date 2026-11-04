import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import {
  SelectPickerModal,
  type PickerOption,
} from "@/components/ui/SelectPickerModal";
import { getExercises } from "@/features/exercises/api/exercise";
import {
  EQUIPMENT_LIST,
  MUSCLE_GROUPS,
  type Equipment,
  type ExerciseRead,
  type MuscleGroup,
} from "@/features/exercises/types/exercise";
import {
  selectExercise,
  clearExercisePicker,
  exercisePickerStore,
} from "@/features/exercises/store/exercisePickerStore";
import { CreateExerciseModal } from "@/features/exercises/components/CreateExerciseModal";

import { TextField } from "@/components/ui/TextField";
import { ExerciseListRow } from "../components/ExerciseListRow";

const PAGE_SIZE = 20;

function formatLabel(val: string): string {
  return val
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const MUSCLE_OPTIONS: readonly PickerOption[] = [
  { label: "All muscles", value: "all" },
  ...MUSCLE_GROUPS.map((mg) => ({
    value: mg,
    label: formatLabel(mg),
  })),
];

const EQUIPMENT_OPTIONS: readonly PickerOption[] = [
  { label: "All equipment", value: "all" },
  ...EQUIPMENT_LIST.map((eq) => ({
    value: eq,
    label: formatLabel(eq),
  })),
];

export function ExercisesScreen() {
  const pickerMounted = useRef(false);
  useEffect(() => {
    pickerMounted.current = true;
    const request = exercisePickerStore.getState().onSelect;
    return () => {
      pickerMounted.current = false;
      // Allow React's development effect replay; never cancel a newer request.
      queueMicrotask(() => {
        if (
          !pickerMounted.current &&
          exercisePickerStore.getState().onSelect === request
        )
          clearExercisePicker();
      });
    };
  }, []);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [activePicker, setActivePicker] = useState<
    "muscle" | "equipment" | null
  >(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const exerciseParams = {
    name: debouncedSearch || undefined,
    muscle_group:
      selectedMuscle === "all" ? undefined : (selectedMuscle as MuscleGroup),
    equipment:
      selectedEquipment === "all"
        ? undefined
        : (selectedEquipment as Equipment),
    limit: PAGE_SIZE,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: exerciseKeys.infiniteList(exerciseParams),
    queryFn: ({ pageParam = 0 }) =>
      getExercises({ ...exerciseParams, offset: pageParam }),
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

  const selectedMuscleLabel =
    MUSCLE_OPTIONS.find((o) => o.value === selectedMuscle)?.label ?? "Muscle";
  const selectedEquipmentLabel =
    EQUIPMENT_OPTIONS.find((o) => o.value === selectedEquipment)?.label ??
    "Equipment";

  return (
    <View className="flex-1 bg-bg px-lg pt-lg">
      {/* Header */}
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
        <TextField
          label="Find an exercise"
          placeholder="Search by name"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Selettori Muscolo & Attrezzo */}
      <View className="mb-md flex-row gap-sm">
        <Pressable
          accessibilityRole="button"
          onPress={() => setActivePicker("muscle")}
          className={`min-h-12 flex-1 flex-row items-center justify-between rounded-sm border px-md active:bg-surface ${
            selectedMuscle !== "all"
              ? "border-accent/60 bg-surface-raised"
              : "border-border bg-surface"
          }`}
        >
          <Text
            numberOfLines={1}
            className={`font-body-medium text-caption max-w-[80%] ${
              selectedMuscle !== "all" ? "text-accent" : "text-text-secondary"
            }`}
          >
            {selectedMuscleLabel}
          </Text>
          <Icon name="chevron-down" size={12} className="text-text-secondary" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setActivePicker("equipment")}
          className={`min-h-12 flex-1 flex-row items-center justify-between rounded-sm border px-md active:bg-surface ${
            selectedEquipment !== "all"
              ? "border-accent/60 bg-surface-raised"
              : "border-border bg-surface"
          }`}
        >
          <Text
            numberOfLines={1}
            className={`font-body-medium text-caption max-w-[80%] ${
              selectedEquipment !== "all"
                ? "text-accent"
                : "text-text-secondary"
            }`}
          >
            {selectedEquipmentLabel}
          </Text>
          <Icon name="chevron-down" size={12} className="text-text-secondary" />
        </Pressable>
      </View>

      {/* Lista Esercizi */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f5f5f5" />
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
              className="mb-md min-h-12 flex-row items-center justify-between border-b border-border py-md active:bg-surface"
            >
              <View className="gap-xs">
                <Text className="font-body-bold text-body text-accent">
                  + Create exercise
                </Text>
                <Text className="font-body text-caption text-text-secondary">
                  If you cannot find an exercise add a new public exercise!
                </Text>
              </View>
            </Pressable>
          }
          renderItem={({ item, index }) => (
            <ExerciseListRow
              name={item.name}
              detail={`${item.muscle_group.replaceAll("_", " ")} · ${item.equipment.replaceAll("_", " ")}`}
              isLast={index === exercises.length - 1}
              action="add"
              onPress={() => handleSelect(item)}
            />
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-lg">
                <ActivityIndicator color="#f5f5f5" />
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <View className="items-center p-xl">
              <Text className="font-body text-caption text-text-secondary">
                No exercises found matching your filters.
              </Text>
            </View>
          }
        />
      )}

      {/* Modale Selezione Gruppo Muscolare */}
      <SelectPickerModal
        visible={activePicker === "muscle"}
        title="Filter by muscle"
        options={MUSCLE_OPTIONS}
        selectedValues={[selectedMuscle]}
        multiSelect={false}
        onConfirm={(vals) => {
          setSelectedMuscle(vals[0] ?? "all");
          setActivePicker(null);
        }}
        onClose={() => setActivePicker(null)}
      />

      {/* Modale Selezione Attrezzatura */}
      <SelectPickerModal
        visible={activePicker === "equipment"}
        title="Filter by equipment"
        options={EQUIPMENT_OPTIONS}
        selectedValues={[selectedEquipment]}
        multiSelect={false}
        onConfirm={(vals) => {
          setSelectedEquipment(vals[0] ?? "all");
          setActivePicker(null);
        }}
        onClose={() => setActivePicker(null)}
      />

      {/* Modale Creazione Esercizio */}
      <CreateExerciseModal
        visible={isCreateModalOpen}
        initialName={search}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(created) => handleSelect(created)}
      />
    </View>
  );
}
