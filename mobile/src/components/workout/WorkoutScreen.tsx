import { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getRoutine } from "@/utils/api/routines";
import { getExerciseStats } from "@/utils/api/exercise";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ExerciseStepPill } from "@/components/workout/ExerciseStepPill";
import {
  WorkoutSetRow,
  type PreviousSet,
} from "@/components/workout/WorkoutSetRow";
import { RestTimerControl } from "@/components/workout/RestTimerControl";
import { SessionHeader } from "@/components/workout/SessionHeader";

import {
  useActiveWorkout,
  toggleWorkoutPause,
  setCurrentExerciseIndex,
  addLocalSetToExercise,
  updateLocalSetLog,
  getActiveWorkoutDurationSeconds,
} from "@/utils/stores/activeWorkoutStore";

import {
  initOrResumeWorkout,
  logSetCompleted,
  updateOrDeleteSetLog,
  removeSetFromExercise,
  finishWorkoutSession,
} from "@/utils/domain/workout";

type WorkoutScreenProp = {
  routineId: string;
};

export function WorkoutScreen({ routineId }: WorkoutScreenProp) {
  // --- All hooks on top (React Hooks rules) ---
  const {
    data: routine,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["routines", routineId],
    queryFn: () => getRoutine(routineId ?? ""),
    enabled: !!routineId,
  });

  const session = useActiveWorkout();
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(windowWidth);
  // Height of a set card, used to size the trailing "add set" card identically
  const [setCardHeight, setSetCardHeight] = useState(0);
  const setsScrollRef = useRef<ScrollViewInstance>(null);
  // Guards against adding more than one set when settling on the add page
  const addingSetRef = useRef(false);

  const activeExercise = routine?.exercises[session?.currentExerciseIndex ?? 0];

  // Fetch stats to prefill the weight from the previous session
  const { data: exerciseStats } = useQuery({
    queryKey: ["exerciseStats", activeExercise?.exercise_id],
    queryFn: () => getExerciseStats(activeExercise!.exercise_id),
    enabled: !!routine && !!session && !!activeExercise,
  });

  // Workout duration timer
  useEffect(() => {
    if (!session || session.isPaused) return;

    setDurationSeconds(getActiveWorkoutDurationSeconds());

    const interval = setInterval(() => {
      setDurationSeconds(getActiveWorkoutDurationSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.isPaused, session?.startedAtTimestamp]);

  // Initialize or resume the session when the routine changes
  useEffect(() => {
    if (routine) {
      initOrResumeWorkout(routine);
    }
  }, [routine]);

  // Prefill weight and reps from the previous session for empty sets
  useEffect(() => {
    if (!exerciseStats || !session || !activeExercise) return;

    // Sort sessions by date descending (most recent first)
    const sortedSessions = [...exerciseStats.sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    session.workoutLogs[activeExercise.exercise_id]?.forEach((setLog, idx) => {
      // If user already entered a weight, do not overwrite
      if (setLog.weight.trim() !== "") return;

      const prevSet = sortedSessions
        .map((s) => s.sets.find((set) => set.set_number === setLog.setNumber))
        .find(Boolean);

      if (prevSet) {
        updateLocalSetLog(activeExercise.exercise_id, idx, {
          weight: String(prevSet.weight),
          reps: String(prevSet.reps),
        });
      }
    });
  }, [exerciseStats, session, activeExercise]);

  // Helper: previous-session reference for a given set number
  const getPreviousSet = useCallback(
    (setNumber: number): PreviousSet | null => {
      if (!exerciseStats) return null;
      const sortedSessions = [...exerciseStats.sessions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      for (const s of sortedSessions) {
        const prevSet = s.sets.find((set) => set.set_number === setNumber);
        if (prevSet) {
          return {
            weight: prevSet.weight,
            reps: prevSet.reps,
            date: s.date,
          };
        }
      }
      return null;
    },
    [exerciseStats],
  );

  // Reset the set index when switching exercise
  function selectExercise(index: number) {
    setCurrentSetIndex(0);
    setsScrollRef.current?.scrollTo({ x: 0, animated: false });
    setCurrentExerciseIndex(index);
  }

  // --- Early returns after all hooks ---
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#f5f5f5" />
      </View>
    );
  }

  if (isError || !routine || !session || !activeExercise) {
    return (
      <View className="flex-1 items-center justify-center gap-md bg-bg p-lg">
        <Text className="font-body-bold text-xl text-text-primary">
          Routine not found
        </Text>
        <Button
          variant="outline"
          label="Go back"
          onPress={() => router.replace("/(tabs)")}
        />
      </View>
    );
  }

  const ex = activeExercise;
  const activeExerciseLogs = session!.workoutLogs[ex.exercise_id] ?? [];
  const isLastExercise =
    session.currentExerciseIndex === routine.exercises.length - 1;

  function handleToggleComplete(setIndex: number) {
    const current = activeExerciseLogs[setIndex];
    if (!current) return;

    if (!current.completed) {
      logSetCompleted(ex.exercise_id, setIndex);
    } else {
      updateOrDeleteSetLog(ex.exercise_id, setIndex, {
        completed: false,
      });
    }
  }

  async function handleRemoveLastSet() {
    const lastIndex = activeExerciseLogs.length - 1;
    const current = activeExerciseLogs[lastIndex];
    if (!current || current.completed) return;

    const removed = await removeSetFromExercise(ex.exercise_id, lastIndex);
    if (!removed) return;

    const nextIndex = Math.max(0, lastIndex - 1);
    setCurrentSetIndex(nextIndex);
    setsScrollRef.current?.scrollTo({
      x: pageWidth * nextIndex,
      animated: true,
    });
  }

  function handleAddSet() {
    if (addingSetRef.current) return;
    addingSetRef.current = true;

    // The new set is appended right where the add page sits, so the carousel
    // is already on the correct page after the re-render.
    const newIndex = activeExerciseLogs.length;
    addLocalSetToExercise(ex.exercise_id, ex.reps);
    setCurrentSetIndex(newIndex);

    setTimeout(() => {
      addingSetRef.current = false;
    }, 400);
  }

  function handleSetsScrollEnd(e: {
    nativeEvent: { contentOffset: { x: number } };
  }) {
    if (pageWidth <= 0) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);

    // Swiped past the last set: create the next one
    if (index >= activeExerciseLogs.length) {
      handleAddSet();
      return;
    }

    // Back on a real set page: re-arm the add guard
    addingSetRef.current = false;

    if (index !== currentSetIndex) {
      setCurrentSetIndex(index);
    }
  }

  async function confirmFinish() {
    setShowFinishModal(false);
    router.replace("/(tabs)");
    await finishWorkoutSession();
  }

  function handleBackToToday() {
    toggleWorkoutPause();
    router.replace("/(tabs)");
  }

  function handleNextExercise() {
    if (isLastExercise) {
      setShowFinishModal(true);
    } else {
      selectExercise(session!.currentExerciseIndex + 1);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <SessionHeader
        durationSeconds={durationSeconds}
        isPaused={session.isPaused}
        onBack={handleBackToToday}
        onTogglePause={toggleWorkoutPause}
        onFinish={() => setShowFinishModal(true)}
      />

      <KeyboardAvoidingView
        className="flex-1 bg-bg"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 70}
        enabled
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-lg p-lg pb-32"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Exercise pills - switch freely */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-xs"
          >
            {routine.exercises.map((exItem, idx) => {
              const logs = session.workoutLogs[exItem.exercise_id] ?? [];
              const isCompleted =
                logs.length > 0 && logs.every((s) => s.completed);
              return (
                <ExerciseStepPill
                  key={exItem.exercise_id}
                  index={idx}
                  name={exItem.name}
                  isActive={idx === session.currentExerciseIndex}
                  isCompleted={isCompleted}
                  onPress={() => selectExercise(idx)}
                />
              );
            })}
          </ScrollView>

          {/* Active exercise info */}
          <View className="gap-xs">
            <Text className="font-body-bold text-title text-text-primary">
              {ex.name}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              Exercise {session.currentExerciseIndex + 1} of{" "}
              {routine.exercises.length}
            </Text>
          </View>

          {/* Rest timer */}
          <RestTimerControl defaultSeconds={ex.rest_time} />

          {/* Swipeable cards: one set per page */}
          <ScrollView
            ref={setsScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleSetsScrollEnd}
            onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
          >
            {activeExerciseLogs.map((setLog, setIdx) => (
              <View
                key={setLog.setNumber}
                style={{ width: pageWidth }}
                className="items-center justify-center"
              >
                <View
                  className="w-full"
                  onLayout={
                    setIdx === 0
                      ? (e) => {
                          const height = Math.round(
                            e.nativeEvent.layout.height,
                          );
                          if (height > 0 && height !== setCardHeight) {
                            setSetCardHeight(height);
                          }
                        }
                      : undefined
                  }
                >
                  <WorkoutSetRow
                    set={setLog}
                    previousSet={getPreviousSet(setLog.setNumber)}
                    isLast={setIdx === activeExerciseLogs.length - 1}
                    onUpdate={(changes) =>
                      updateOrDeleteSetLog(ex.exercise_id, setIdx, changes)
                    }
                    onToggleComplete={() => handleToggleComplete(setIdx)}
                    onRemove={
                      activeExerciseLogs.length > 1
                        ? handleRemoveLastSet
                        : undefined
                    }
                  />
                </View>
              </View>
            ))}

            {/* Trailing page: swiping past the last set creates a new one */}
            <View
              style={{ width: pageWidth }}
              className="items-center justify-center"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add set"
                onPress={handleAddSet}
                style={
                  setCardHeight > 0 ? { minHeight: setCardHeight } : undefined
                }
                className="w-full items-center justify-center gap-sm rounded-lg border border-dashed border-border bg-surface active:bg-surface-raised"
              >
                <Icon name="plus" size={28} className="text-text-secondary" />
                <Text className="font-body-semibold text-body text-text-secondary">
                  Add set
                </Text>
                <Text className="font-body text-caption text-text-secondary">
                  Swipe here to add the next set
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Set page indicator */}
          {activeExerciseLogs.length > 1 ? (
            <View className="flex-row justify-center gap-xs">
              {activeExerciseLogs.map((setLog, idx) => (
                <View
                  key={setLog.setNumber}
                  className={`h-1.5 rounded-full ${
                    idx === currentSetIndex
                      ? "w-4 bg-accent"
                      : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </View>
          ) : null}

          {/* Next exercise / finish workout button */}
          <Pressable
            accessibilityRole="button"
            onPress={handleNextExercise}
            className="w-[92%] self-center min-h-14 rounded-md bg-accent active:bg-accent-pressed flex-row items-center justify-center gap-sm"
          >
            <Text className="font-body-bold text-lg text-on-accent">
              {isLastExercise ? "Complete workout" : "Next exercise"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showFinishModal}
        title="Finish workout"
        description="Are you sure you want to end and save this training session?"
        confirmLabel="Finish & Save"
        cancelLabel="Keep training"
        onConfirm={confirmFinish}
        onCancel={() => setShowFinishModal(false)}
      />
    </View>
  );
}
