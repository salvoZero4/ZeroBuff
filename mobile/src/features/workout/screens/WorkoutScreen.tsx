import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from "react-native";
import { router } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";

import { getRoutine } from "@/features/routines/api/routines";
import { getExerciseStats } from "@/features/exercises/api/exercise";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ExerciseStepPill } from "@/features/workout/components/ExerciseStepPill";
import {
  WorkoutSetRow,
  type PreviousSet,
} from "@/features/workout/components/WorkoutSetRow";
import { RestTimerControl } from "@/features/workout/components/RestTimerControl";
import { SessionHeader } from "@/features/workout/components/SessionHeader";
import {
  useActiveWorkout,
  toggleWorkoutPause,
  setCurrentExerciseIndex,
  addLocalSetToExercise,
  updateLocalSetLog,
  editSetLog,
  getActiveWorkoutDurationSeconds,
} from "@/features/workout/store/activeWorkoutStore";
import {
  initOrResumeWorkout,
  logSetCompleted,
  updateOrDeleteSetLog,
  removeSetFromExercise,
  finishWorkoutSession,
  retrySetLog,
  workoutErrorMessage,
} from "@/features/workout/utils/workout";

type WorkoutScreenProp = {
  routineId: string;
};

// The keyboard toolbar defaults to the system keyboard appearance, which is
// light (#F8F8F8) on a light-mode device even though the app is dark-only.
// Force the app palette for both appearances so no white bar shows up above
// the keyboard.
const KEYBOARD_TOOLBAR_THEME = {
  light: {
    primary: "#f5f5f5",
    disabled: "#6f6f6f",
    background: "#151515",
    ripple: "#303030",
  },
  dark: {
    primary: "#f5f5f5",
    disabled: "#6f6f6f",
    background: "#151515",
    ripple: "#303030",
  },
};

export function WorkoutScreen({ routineId }: WorkoutScreenProp) {
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
  const network = useNetInfo();
  const [finishError, setFinishError] = useState<string | null>(null);
  const finishingRef = useRef(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(windowWidth);
  const [setCardHeight, setSetCardHeight] = useState(0);
  const setsScrollRef = useRef<ScrollViewInstance>(null);
  const addingSetRef = useRef(false);
  const insets = useSafeAreaInsets();

  const activeExercise = routine?.exercises[session?.currentExerciseIndex ?? 0];

  const { data: exerciseStats } = useQuery({
    queryKey: ["exerciseStats", activeExercise?.exercise_id],
    queryFn: () => getExerciseStats(activeExercise!.exercise_id),
    enabled: !!routine && !!session && !!activeExercise,
  });

  const previousSessions = useMemo(() => {
    if (!exerciseStats) return [];
    return exerciseStats.sessions
      .filter((s) => s.session_id !== session?.sessionId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [exerciseStats, session?.sessionId]);

  useEffect(() => {
    if (!session || session.isPaused) return;
    const initialUpdate = setTimeout(() => {
      setDurationSeconds(getActiveWorkoutDurationSeconds());
    }, 0);
    const interval = setInterval(() => {
      setDurationSeconds(getActiveWorkoutDurationSeconds());
    }, 1000);
    return () => {
      clearTimeout(initialUpdate);
      clearInterval(interval);
    };
  }, [session, session?.isPaused, session?.startedAtTimestamp]);

  useEffect(() => {
    if (!routine) return;
    let cancelled = false;
    initOrResumeWorkout(routine).then((active) => {
      if (!cancelled && active && active.routineId !== routine.id) {
        router.replace({
          pathname: "/workout/[routineId]",
          params: { routineId: active.routineId },
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [routine]);

  useEffect(() => {
    if (!session || !activeExercise) return;
    session.workoutLogs[activeExercise.exercise_id]?.forEach((setLog, idx) => {
      if (setLog.touched || setLog.completed) return;
      if (setLog.weight.trim() !== "") return;
      const prevSet = previousSessions
        .map((s) => s.sets.find((set) => set.set_number === setLog.setNumber))
        .find(Boolean);
      if (prevSet) {
        updateLocalSetLog(activeExercise.exercise_id, idx, {
          weight: String(prevSet.weight),
          reps: String(prevSet.reps),
        });
      }
    });
  }, [previousSessions, session, activeExercise]);

  const getPreviousSet = useCallback(
    (setNumber: number): PreviousSet | null => {
      for (const s of previousSessions) {
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
    [previousSessions],
  );

  function selectExercise(index: number) {
    setCurrentSetIndex(0);
    setsScrollRef.current?.scrollTo({ x: 0, animated: false });
    setCurrentExerciseIndex(index);
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#f5f5f5" />
      </View>
    );
  }

  if (
    isError ||
    !routine ||
    (session && session.routineId !== routine.id) ||
    !activeExercise ||
    !session
  ) {
    return (
      <View className="flex-1 items-center justify-center gap-md bg-bg p-lg">
        <ActivityIndicator color="#f5f5f5" />
      </View>
    );
  }

  const ex = activeExercise;
  const activeExerciseLogs = session.workoutLogs[ex.exercise_id] ?? [];
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
    if (session?.isFinishing || addingSetRef.current) return;
    addingSetRef.current = true;
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
    if (index >= activeExerciseLogs.length) {
      handleAddSet();
      return;
    }
    addingSetRef.current = false;
    if (index !== currentSetIndex) {
      setCurrentSetIndex(index);
    }
  }

  async function confirmFinish() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishError(null);
    try {
      if (await finishWorkoutSession()) {
        setShowFinishModal(false);
        router.replace("/(tabs)");
      }
    } catch (error) {
      setFinishError(workoutErrorMessage(error));
    } finally {
      finishingRef.current = false;
    }
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

      {network.isConnected === false ||
      network.isInternetReachable === false ? (
        <View
          accessibilityLiveRegion="polite"
          className="bg-surface px-lg py-sm"
        >
          <Text className="font-body text-caption text-text-secondary">
            You are offline. Reconnect to save your sets and finish this
            workout.
          </Text>
        </View>
      ) : null}

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        keyboardShouldPersistTaps="handled"
        mode="layout"
        bottomOffset={80}
        extraKeyboardSpace={12}
      >
        {/* Pills Esercizi */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // A horizontal ScrollView defaults to flexGrow: 1 and would stretch
          // vertically inside the column, stretching the active (white) pill
          // into a full-height bar.
          style={{ flexGrow: 0 }}
          contentContainerClassName="gap-xs items-center"
          keyboardShouldPersistTaps="handled"
        >
          {routine.exercises.map((exItem, idx) => {
            const logs = session.workoutLogs[exItem.exercise_id] ?? [];
            const isCompleted =
              logs.length > 0 &&
              logs.every(
                (s) =>
                  s.completed &&
                  s.backendId &&
                  (!s.saveStatus || s.saveStatus === "saved"),
              );
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

        {/* Info Esercizio */}
        <View className="gap-xs">
          <Text className="font-body-bold text-title text-text-primary">
            {ex.name}
          </Text>
          <Text className="font-body text-caption text-text-secondary">
            Exercise {session.currentExerciseIndex + 1} of{" "}
            {routine.exercises.length}
          </Text>
        </View>

        {/* Timer Riposo */}
        <RestTimerControl defaultSeconds={ex.rest_time} />

        {/* Carosello Set */}
        <ScrollView
          ref={setsScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          keyboardShouldPersistTaps="handled"
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
                        const height = Math.round(e.nativeEvent.layout.height);
                        if (height > 0 && height !== setCardHeight) {
                          setSetCardHeight(height);
                        }
                      }
                    : undefined
                }
              >
                <WorkoutSetRow
                  set={setLog}
                  disabled={session.isFinishing}
                  onSave={() => {
                    void updateOrDeleteSetLog(ex.exercise_id, setIdx, {});
                  }}
                  onRetry={() => {
                    void retrySetLog(ex.exercise_id, setIdx);
                  }}
                  previousSet={getPreviousSet(setLog.setNumber)}
                  isLast={setIdx === activeExerciseLogs.length - 1}
                  onUpdate={(changes) =>
                    editSetLog(ex.exercise_id, setIdx, changes)
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

          {/* Card aggiungi set */}
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

        {/* Indicatori Pagine */}
        {activeExerciseLogs.length > 1 ? (
          <View className="flex-row justify-center gap-xs">
            {activeExerciseLogs.map((setLog, idx) => (
              <View
                key={setLog.setNumber}
                className={`h-1.5 rounded-full ${
                  idx === currentSetIndex ? "w-4 bg-accent" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </View>
        ) : null}

        {/* Pulsante Avanzamento */}
        <Pressable
          accessibilityRole="button"
          onPress={handleNextExercise}
          className="w-[92%] self-center min-h-14 rounded-md bg-accent active:bg-accent-pressed flex-row items-center justify-center gap-sm"
        >
          <Text className="font-body-bold text-lg text-on-accent">
            {isLastExercise ? "Complete workout" : "Next exercise"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <ConfirmModal
        visible={showFinishModal}
        title="Finish workout"
        description={
          finishError ??
          "Are you sure you want to end and save this training session?"
        }
        confirmLabel={
          session.isFinishing
            ? "Saving…"
            : finishError
              ? "Retry"
              : "Finish & Save"
        }
        isPending={session.isFinishing}
        cancelLabel="Keep training"
        onConfirm={confirmFinish}
        onCancel={() => setShowFinishModal(false)}
      />

      <KeyboardToolbar theme={KEYBOARD_TOOLBAR_THEME} />
    </View>
  );
}
