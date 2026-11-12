import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useReducedMotion,
} from "react-native-reanimated";
import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import { routineKeys } from "@/features/routines/api/queryKeys";
import { startForegroundTicker } from "@/features/workout/utils/foregroundTicker";
import { WorkoutSummaryScreen } from "@/features/workout/components/WorkoutSummaryScreen";
import {
  summarizeWorkout,
  isSetSaved,
  nextSetAfterSave,
  type WorkoutSummary,
} from "@/features/workout/utils/experience";
import { WorkoutSkeleton } from "@/features/workout/components/WorkoutSkeleton";
import { ScreenError } from "@/components/ui/ScreenState";
import { loadErrorMessage } from "@/shared/api/loadError";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  AppState,
  Keyboard,
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
  useWorkoutPersistenceError,
  retryWorkoutPersistence,
  toggleWorkoutPause,
  pauseWorkout,
  setCurrentExerciseIndex,
  addLocalSetToExercise,
  updateLocalSetLog,
  editSetLog,
  getActiveWorkoutDurationSeconds,
  getActiveWorkout,
  setWorkoutRestEndTimestamp,
  toggleAutoRest,
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

const exerciseEntrance = FadeIn.duration(180)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

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
  const reduceMotion = useReducedMotion();
  const {
    data: routine,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: routineKeys.detail(routineId),
    queryFn: () => getRoutine(routineId ?? ""),
    enabled: !!routineId,
  });

  const session = useActiveWorkout();
  const persistenceError = useWorkoutPersistenceError();
  const [initError, setInitError] = useState(false);
  const [initAttempt, setInitAttempt] = useState(0);
  const network = useNetInfo();
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const previousSetsRef = useRef<
    Record<string, { weight: number; reps: number }[]>
  >({});
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
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
  const interactionEpoch = useRef(0);
  const pagerContentWidthRef = useRef(0);
  const insets = useSafeAreaInsets();

  const activeExercise = routine?.exercises[session?.currentExerciseIndex ?? 0];

  const { data: exerciseStats } = useQuery({
    queryKey: exerciseKeys.stats(activeExercise?.exercise_id),
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
    if (!session) return;
    return startForegroundTicker(AppState, () => {
      setDurationSeconds(getActiveWorkoutDurationSeconds());
      return !session.isPaused;
    });
  }, [session, session?.isPaused, session?.startedAtTimestamp]);

  useEffect(() => {
    if (!routine) return;
    let cancelled = false;
    initOrResumeWorkout(routine)
      .then((active) => {
        if (!cancelled && active && active.routineId !== routine.id) {
          router.replace({
            pathname: "/workout/[routineId]",
            params: { routineId: active.routineId },
          });
        }
      })
      .catch(() => {
        if (!cancelled) setInitError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [routine, initAttempt]);

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

  useEffect(() => {
    if (activeExercise && previousSessions[0]) {
      previousSetsRef.current[activeExercise.exercise_id] =
        previousSessions[0].sets;
    }
  }, [activeExercise, previousSessions]);

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
    interactionEpoch.current++;
    Keyboard.dismiss();
    setCurrentSetIndex(0);
    // Re-selecting the current exercise does not remount its pager.
    if (index === session?.currentExerciseIndex) {
      setsScrollRef.current?.scrollTo({ x: 0, animated: false });
    }
    addingSetRef.current = false;
    pagerContentWidthRef.current = 0;
    setCurrentExerciseIndex(index);
  }

  if (summary)
    return (
      <WorkoutSummaryScreen
        summary={summary}
        onDone={() => router.replace("/(tabs)")}
        onViewWorkout={() => {
          if (summary.sessionId)
            router.push({
              pathname: "/session/[sessionId]",
              params: { sessionId: summary.sessionId },
            });
        }}
      />
    );

  if (isError || !routineId)
    return (
      <ScreenError
        title="Workout couldn’t load"
        message={loadErrorMessage(error)}
        onRetry={() => {
          void refetch();
        }}
        busy={isFetching}
        onBack={() => router.replace("/(tabs)")}
      />
    );
  if (initError)
    return (
      <ScreenError
        title="Workout recovery couldn’t finish"
        message={
          persistenceError ??
          "Your saved workout couldn’t be restored. Please try again."
        }
        onRetry={() => {
          setInitError(false);
          setInitAttempt((attempt) => attempt + 1);
        }}
        onBack={() => router.replace("/(tabs)")}
      />
    );
  if (isLoading || !routine || !session || session.routineId !== routine.id)
    return <WorkoutSkeleton />;
  if (!activeExercise)
    return (
      <ScreenError
        title="No exercises in this routine"
        message="Add exercises to your routine before starting a workout."
        onRetry={() => {
          void refetch();
        }}
        busy={isFetching}
        onBack={() => router.replace("/(tabs)")}
      />
    );

  const ex = activeExercise;
  const activeExerciseLogs = session.workoutLogs[ex.exercise_id] ?? [];
  const isLastExercise =
    session.currentExerciseIndex === routine.exercises.length - 1;

  async function completeAndAdvance(setIndex: number, retry = false) {
    const snapshot = getActiveWorkout();
    const epoch = interactionEpoch.current;
    if (retry) await retrySetLog(ex.exercise_id, setIndex);
    else await logSetCompleted(ex.exercise_id, setIndex, ex.rest_time);
    const latest = getActiveWorkout();
    const next = nextSetAfterSave(
      snapshot,
      latest,
      ex.exercise_id,
      setIndex,
      epoch !== interactionEpoch.current,
    );
    if (next >= 0) {
      Keyboard.dismiss();
      setCurrentSetIndex(next);
      setsScrollRef.current?.scrollTo({
        x: pageWidth * next,
        animated: !reduceMotion,
      });
    }
  }

  function handleToggleComplete(setIndex: number) {
    const current = activeExerciseLogs[setIndex];
    if (!current || current.saveStatus === "pending") return;
    if (!current.completed) void completeAndAdvance(setIndex);
    else
      void updateOrDeleteSetLog(ex.exercise_id, setIndex, { completed: false });
  }

  async function handleRemoveLastSet() {
    const snapshot = getActiveWorkout();
    const lastIndex = activeExerciseLogs.length - 1;
    setRemoveError(null);
    try {
      const removed = await removeSetFromExercise(ex.exercise_id, lastIndex);
      if (
        !removed ||
        getActiveWorkout()?.startedAtTimestamp !==
          snapshot?.startedAtTimestamp ||
        getActiveWorkout()?.currentExerciseIndex !==
          session!.currentExerciseIndex
      )
        return;
      setShowRemoveModal(false);
      const nextIndex = Math.max(0, lastIndex - 1);
      setCurrentSetIndex(nextIndex);
      setsScrollRef.current?.scrollTo({
        x: pageWidth * nextIndex,
        animated: !reduceMotion,
      });
    } catch (error) {
      setRemoveError(workoutErrorMessage(error));
    }
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
    if (
      pageWidth <= 0 ||
      routine?.exercises[getActiveWorkout()?.currentExerciseIndex ?? 0]
        ?.exercise_id !== ex.exercise_id
    )
      return;
    const index = Math.max(
      0,
      Math.min(
        activeExerciseLogs.length,
        Math.round(e.nativeEvent.contentOffset.x / pageWidth),
      ),
    );
    interactionEpoch.current++;
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
      const snapshot = getActiveWorkout();
      const duration = getActiveWorkoutDurationSeconds();
      let confirmedSessionId = snapshot?.sessionId ?? null;
      if (
        await finishWorkoutSession((id) => {
          confirmedSessionId = id;
        })
      ) {
        if (snapshot)
          setSummary(
            summarizeWorkout(
              { ...snapshot, sessionId: confirmedSessionId },
              duration,
              previousSetsRef.current,
              Object.fromEntries(
                (routine?.exercises ?? []).map((exercise) => [
                  exercise.exercise_id,
                  exercise.name,
                ]),
              ),
            ),
          );
        setShowFinishModal(false);
      }
    } catch (error) {
      setFinishError(workoutErrorMessage(error));
    } finally {
      finishingRef.current = false;
    }
  }

  function handleBackToToday() {
    pauseWorkout();
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

      {persistenceError ? (
        <View
          accessibilityLiveRegion="polite"
          className="gap-xs bg-surface px-lg py-sm"
        >
          <Text className="font-body text-caption text-danger">
            {persistenceError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void retryWorkoutPersistence().catch(() => {});
            }}
            className="min-h-12 justify-center"
          >
            <Text className="font-body-medium text-caption text-text-primary">
              Try again
            </Text>
          </Pressable>
        </View>
      ) : null}

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg"
        contentContainerStyle={{ flexGrow: 1 }}
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
        <Animated.View
          key={ex.exercise_id}
          entering={exerciseEntrance}
          className="flex-row items-center gap-md"
        >
          <Text className="flex-1 font-body-semibold text-xl text-text-primary">
            {ex.name}
          </Text>
          <Text className="font-body text-caption text-text-secondary">
            {session.currentExerciseIndex + 1} / {routine.exercises.length}
          </Text>
        </Animated.View>

        <View className="flex-1 justify-center gap-lg">
          {/* Timer Riposo */}
          <RestTimerControl
            defaultSeconds={ex.rest_time}
            targetEndTimestamp={session.restEndTimestamp ?? null}
            onTargetChange={setWorkoutRestEndTimestamp}
            autoRestEnabled={session.autoRestEnabled ?? true}
            onToggleAutoRest={toggleAutoRest}
          />

          {/* Carosello Set */}
          <ScrollView
            key={`${ex.exercise_id}:${pageWidth}`}
            ref={setsScrollRef}
            horizontal
            pagingEnabled
            snapToInterval={pageWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onContentSizeChange={(width) => {
              if (width === pagerContentWidthRef.current) return;
              pagerContentWidthRef.current = width;
              setsScrollRef.current?.scrollTo({
                x:
                  pageWidth *
                  Math.min(currentSetIndex, activeExerciseLogs.length),
                animated: false,
              });
            }}
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={handleSetsScrollEnd}
            onLayout={(e) => {
              const width = e.nativeEvent.layout.width;
              if (width > 0 && width !== pageWidth) {
                pagerContentWidthRef.current = 0;
                setPageWidth(width);
              }
            }}
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
                    totalSets={activeExerciseLogs.length}
                    onInteract={() => {
                      interactionEpoch.current++;
                    }}
                    disabled={session.isFinishing}
                    onSave={() => {
                      void updateOrDeleteSetLog(ex.exercise_id, setIdx, {});
                    }}
                    onRetry={() => {
                      void completeAndAdvance(setIdx, true);
                    }}
                    previousSet={getPreviousSet(setLog.setNumber)}
                    isLast={setIdx === activeExerciseLogs.length - 1}
                    onUpdate={(changes) => {
                      interactionEpoch.current++;
                      editSetLog(ex.exercise_id, setIdx, changes);
                    }}
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

          <View className="flex-row items-center justify-end gap-sm">
            <Text
              accessibilityLiveRegion="polite"
              className="font-body text-caption text-text-secondary"
            >
              {activeExerciseLogs.filter(isSetSaved).length} of{" "}
              {activeExerciseLogs.length} saved
            </Text>
          </View>

          {removeError ? (
            <Text
              accessibilityLiveRegion="polite"
              className="font-body text-caption text-danger"
            >
              Could not remove the set. {removeError}
            </Text>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
      <View
        className="bg-bg px-lg pt-sm"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handleNextExercise}
          className="w-full min-h-14 items-center justify-center rounded-md bg-accent active:bg-accent-pressed"
        >
          <Text className="font-body-semibold text-body text-on-accent">
            {isLastExercise ? "Complete workout" : "Next exercise"}
          </Text>
        </Pressable>
      </View>

      <ConfirmModal
        visible={showRemoveModal}
        title="Remove saved set?"
        description={
          removeError ??
          "This removes the last set and its saved performance from this workout."
        }
        confirmLabel="Remove set"
        isDestructive
        isPending={activeExerciseLogs.at(-1)?.saveStatus === "pending"}
        onConfirm={() => {
          void handleRemoveLastSet();
        }}
        onCancel={() => setShowRemoveModal(false)}
      />

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
