import { useExerciseNames } from "@/features/exercises/api/useExerciseNames";
import { useTranslation } from "react-i18next";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useReducedMotion,
} from "react-native-reanimated";
import { exerciseKeys } from "@/features/exercises/api/queryKeys";
import { startForegroundTicker } from "@/features/workout/utils/foregroundTicker";
import { WorkoutSummaryScreen } from "@/features/workout/components/WorkoutSummaryScreen";
import {
  summarizeWorkout,
  describeWorkoutFinish,
  getFinishBlocker,
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

import { offlineStartEnabled, useWorkoutRoutine } from "../storage/useCachedWorkoutData";
import { useAuth } from "@/features/auth/provider/AuthProvider";
import { useQueuedWorkouts } from "../sync/WorkoutSyncProvider";
import { getExerciseStats } from "@/features/exercises/api/exercise";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ExerciseStepPill } from "@/features/workout/components/ExerciseStepPill";
import {
  WorkoutSetRow,
  type PreviousSet,
} from "@/features/workout/components/WorkoutSetRow";
import {
  RestTimerControl,
  REST_DIGIT_LINE_HEIGHT,
} from "@/features/workout/components/RestTimerControl";
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
  adjustRestTimer,
  pauseRestTimer,
  resumeRestTimer,
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
  const { t } = useTranslation();
  const exerciseName = useExerciseNames();
  const reduceMotion = useReducedMotion();
  const session = useActiveWorkout();
  const { accountId } = useAuth();
  const [localSummary, setLocalSummary] = useState(false);
  const queue = useQueuedWorkouts();
  const {
    data: loadedRoutine,
    isError,
    error,
    refetch,
    isFetching,
    loadingLocal,
  } = useWorkoutRoutine(routineId, !session?.routineSnapshot && !localSummary);
  const routine = session?.routineSnapshot ?? loadedRoutine;
  const persistenceError = useWorkoutPersistenceError();
  const [initError, setInitError] = useState(false);
  const [initAttempt, setInitAttempt] = useState(0);
  const network = useNetInfo();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const previousSetsRef = useRef<
    Record<string, { weight: number; reps: number }[]>
  >({});
  const [removeSetStep, setRemoveSetStep] = useState<"options" | "confirm" | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const finishingRef = useRef(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(windowWidth);
  const [workoutBodyHeight, setWorkoutBodyHeight] = useState(0);
  const [exerciseHeadingHeight, setExerciseHeadingHeight] = useState(0);
  const [setCardHeights, setSetCardHeights] = useState<Record<string, number>>({});
  const setsScrollRef = useRef<ScrollViewInstance>(null);
  const addingSetRef = useRef(false);
  const interactionEpoch = useRef(0);
  const pagerContentLayoutRef = useRef<{ key: string; width: number } | null>(null);
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
    if (session?.localId && session.routineId !== routineId) {
      router.replace({ pathname: "/workout/[routineId]", params: { routineId: session.routineId } });
    }
  }, [session?.localId, session?.routineId, routineId]);

  const hasSession = Boolean(session);
  useEffect(() => {
    if (!routine || summary || finishingRef.current || session?.localId || !routine.exercises.length) return;
    if (offline && !offlineStartEnabled && !hasSession) return;
    let cancelled = false;
    initOrResumeWorkout(routine, offline)
      .then((active) => {
        if (!cancelled) setInitError(false);
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
  }, [routine, initAttempt, offline, session?.localId, hasSession, summary, accountId]);

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
    pagerContentLayoutRef.current = null;
    setCurrentExerciseIndex(index);
  }

  if (summary) {
    const queuedWorkout = queue.data?.find((item) => item.payload.id === summary.sessionId);
    const synced = !localSummary || (queue.isSuccess && !queuedWorkout);
    return (
      <WorkoutSummaryScreen
        summary={summary}
        onDone={() => router.replace("/(tabs)")}
        syncLabel={localSummary ? (synced ? t("Synced") : t("Saved on this device")) : undefined}
        onViewWorkout={() => {
          if (summary.sessionId)
            router.push({
              pathname: "/session/[sessionId]",
              params: { sessionId: summary.sessionId },
            });
        }}
      />
    );
  }

  if ((!routine && !loadingLocal && (isError || offline)) || (offline && !offlineStartEnabled && !hasSession) || !routineId)
    return (
      <ScreenError
        title={t("Workout couldn’t load")}
        message={offline ? t("Connect to download this routine.") : t(loadErrorMessage(error))}
        onRetry={() => {
          void refetch();
        }}
        busy={isFetching}
        onBack={() => router.replace("/(tabs)")}
      />
    );
  if (initError && !session?.localId)
    return (
      <ScreenError
        title={t("Workout recovery couldn’t finish")}
        message={
          (persistenceError ? t(persistenceError) : null) ??
          t("Your saved workout couldn’t be restored. Please try again.")
        }
        onRetry={() => {
          setInitError(false);
          setInitAttempt((attempt) => attempt + 1);
        }}
        onBack={() => router.replace("/(tabs)")}
      />
    );
  if (!routine || (!session && routine.exercises.length > 0) || (session && session.routineId !== routineId))
    return <WorkoutSkeleton />;
  if (!activeExercise || !session)
    return (
      <ScreenError
        title={t("No exercises in this routine")}
        message={t("Add exercises to your routine before starting a workout.")}
        onRetry={() => {
          void refetch();
        }}
        busy={isFetching}
        onBack={() => router.replace("/(tabs)")}
      />
    );

  const ex = activeExercise;
  const activeExerciseLogs = session.workoutLogs[ex.exercise_id] ?? [];
  const savedSets = activeExerciseLogs.filter(isSetSaved).length;
  const pagerKey = `${ex.exercise_id}:${pageWidth}:${fontScale}`;
  const firstCardHeight = setCardHeights[`${pagerKey}:0`];
  const selectedCardHeight = setCardHeights[`${pagerKey}:${currentSetIndex}`];
  const visibleCardHeight = selectedCardHeight ?? firstCardHeight;
  // Reserve room for controls and spacing before sizing the timer digits.
  const timerChromeHeight = 112;
  const timerDigitBudget =
    workoutBodyHeight -
    (exerciseHeadingHeight || 76) -
    (visibleCardHeight || 170) -
    timerChromeHeight;
  const timerDigitSize = workoutBodyHeight
    ? Math.max(
        44,
        Math.min(96, Math.floor(timerDigitBudget / (REST_DIGIT_LINE_HEIGHT * fontScale))),
      )
    : 64;
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
      setRemoveSetStep(null);
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
      if (!snapshot) return;
      const result = summarizeWorkout(
        { ...snapshot, sessionId: snapshot.localId ?? confirmedSessionId },
        duration,
        previousSetsRef.current,
        Object.fromEntries((routine?.exercises ?? []).map((exercise) => [exercise.exercise_id, exercise.name])),
      );
      if (await finishWorkoutSession((id) => { confirmedSessionId = id; }, result)) {
        setLocalSummary(Boolean(snapshot.localId));
        setSummary({ ...result, sessionId: confirmedSessionId });
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

  function openFinishModal() {
    setFinishError(null);
    setShowFinishModal(true);
  }

  function handleNextExercise() {
    if (isLastExercise) {
      openFinishModal();
    } else {
      selectExercise(session!.currentExerciseIndex + 1);
    }
  }

  const finishSets = showFinishModal
    ? Object.values(session.workoutLogs).flat()
    : [];
  const finishBlocker = getFinishBlocker(finishSets);

  return (
    <View className="flex-1 bg-bg">
      <SessionHeader
        durationSeconds={durationSeconds}
        isPaused={session.isPaused}
        onBack={handleBackToToday}
        onTogglePause={toggleWorkoutPause}
        onFinish={openFinishModal}
      />

      {offline ? (
        <View
          accessibilityLiveRegion="polite"
          className="bg-surface px-lg py-sm"
        >
          <Text className="font-body text-caption text-text-secondary">
            {t(
              session.localId ? "You are offline. Your workout is saved on this device." : "You are offline. Reconnect to save your sets and finish this workout.",
            )}
          </Text>
        </View>
      ) : null}

      {persistenceError ? (
        <View
          accessibilityLiveRegion="polite"
          className="gap-xs bg-surface px-lg py-sm"
        >
          <Text className="font-body text-caption text-danger">
            {t(persistenceError)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void retryWorkoutPersistence().catch(() => {});
            }}
            className="min-h-12 justify-center"
          >
            <Text className="font-body-medium text-caption text-text-primary">
              {t("Try again")}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-sm px-md py-sm"
        contentContainerStyle={{ flexGrow: 1 }}
        onLayout={({ nativeEvent }) =>
          setWorkoutBodyHeight(nativeEvent.layout.height)
        }
        keyboardShouldPersistTaps="handled"
        mode="layout"
        bottomOffset={80}
        extraKeyboardSpace={12}
      >
        <View
          className="gap-xs"
          onLayout={({ nativeEvent }) =>
            setExerciseHeadingHeight(nativeEvent.layout.height)
          }
        >
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
                    (s.backendId || s.localSaved) &&
                    (!s.saveStatus || s.saveStatus === "saved"),
                );
              return (
                <ExerciseStepPill
                  key={exItem.exercise_id}
                  index={idx}
                  name={exerciseName(exItem.exercise_id, exItem.name)}
                  isActive={idx === session.currentExerciseIndex}
                  isCompleted={isCompleted}
                  onPress={() => selectExercise(idx)}
                />
              );
            })}
          </ScrollView>

          <Animated.View
            key={ex.exercise_id}
            entering={exerciseEntrance}
            className="flex-row items-center gap-md"
          >
            <Text className="flex-1 font-body-semibold text-body text-text-primary">
              {exerciseName(ex.exercise_id, ex.name)}
            </Text>
            <Text className="font-body text-caption text-text-secondary">
              {session.currentExerciseIndex + 1} / {routine.exercises.length}
            </Text>
          </Animated.View>
        </View>

        <View className="grow justify-center gap-sm">
          <RestTimerControl
            defaultSeconds={ex.rest_time}
            targetEndTimestamp={session.restEndTimestamp ?? null}
            pausedRemainingMs={
              session.restTimerOverride?.state === "paused"
                ? session.restTimerOverride.remainingMs
                : null
            }
            digitSize={timerDigitSize}
            onTargetChange={setWorkoutRestEndTimestamp}
            onPause={pauseRestTimer}
            onResume={resumeRestTimer}
            onAdjust={adjustRestTimer}
            autoRestEnabled={session.autoRestEnabled ?? true}
            onToggleAutoRest={toggleAutoRest}
          />

          <ScrollView
            key={pagerKey}
            ref={setsScrollRef}
            horizontal
            pagingEnabled
            snapToInterval={pageWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onContentSizeChange={(width) => {
              const previous = pagerContentLayoutRef.current;
              if (previous?.key === pagerKey && previous.width === width) return;
              pagerContentLayoutRef.current = { key: pagerKey, width };
              setsScrollRef.current?.scrollTo({
                x:
                  pageWidth *
                  Math.min(currentSetIndex, activeExerciseLogs.length),
                animated: false,
              });
            }}
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, flexShrink: 0, height: visibleCardHeight }}
            contentContainerClassName="items-start"
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={handleSetsScrollEnd}
            onLayout={(e) => {
              const width = e.nativeEvent.layout.width;
              if (width > 0 && width !== pageWidth) {
                pagerContentLayoutRef.current = null;
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
                  onLayout={({ nativeEvent }) => {
                    const height = Math.ceil(nativeEvent.layout.height);
                    const key = `${pagerKey}:${setIdx}`;
                    if (height > 0) {
                      setSetCardHeights((heights) =>
                        heights[key] === height
                          ? heights
                          : { ...heights, [key]: height },
                      );
                    }
                  }}
                >
                  <WorkoutSetRow
                    set={setLog}
                    totalSets={activeExerciseLogs.length}
                    savedSets={savedSets}
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
                        ? () => {
                            Keyboard.dismiss();
                            setRemoveError(null);
                            setRemoveSetStep("options");
                          }
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
                accessibilityLabel={t("Add set")}
                onPress={handleAddSet}
                style={
                  visibleCardHeight ? { minHeight: visibleCardHeight } : undefined
                }
                className="w-full items-center justify-center gap-sm rounded-lg border border-dashed border-border bg-surface active:bg-surface-raised"
              >
                <Icon name="plus" size={28} className="text-text-secondary" />
                <Text className="font-body-semibold text-body text-text-secondary">
                  {t("Add set")}
                </Text>
                <Text className="font-body text-caption text-text-secondary">
                  {t("Swipe here to add the next set")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          {removeError ? (
            <Text
              accessibilityLiveRegion="polite"
              className="font-body text-caption text-danger"
            >
              {t("Could not remove the set.")} {t(removeError)}
            </Text>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
      <View
        className="bg-bg px-md pt-xs"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handleNextExercise}
          className="w-full min-h-12 items-center justify-center rounded-md bg-accent active:bg-accent-pressed"
        >
          <Text className="font-body-semibold text-body text-on-accent">
            {isLastExercise ? t("Complete workout") : t("Next exercise")}
          </Text>
        </Pressable>
      </View>

      <ConfirmModal
        visible={removeSetStep !== null}
        title={
          removeSetStep === "options"
            ? t("Options for set {{number}}", { number: activeExerciseLogs.at(-1)?.setNumber })
            : t("Remove saved set?")
        }
        description={
          removeSetStep === "confirm"
            ? (removeError ??
              t("This removes the last set and its saved performance from this workout."))
            : undefined
        }
        confirmLabel={t("Remove set")}
        isDestructive
        isPending={activeExerciseLogs.at(-1)?.saveStatus === "pending"}
        onConfirm={() => {
          if (removeSetStep === "options") setRemoveSetStep("confirm");
          else void handleRemoveLastSet();
        }}
        onCancel={() => setRemoveSetStep(null)}
      />

      <ConfirmModal
        visible={showFinishModal}
        title={t("Finish workout")}
        description={
          finishBlocker
            ? t(finishBlocker)
            : finishError
              ? t(finishError)
              : describeWorkoutFinish(finishSets, (key, options) =>
                  t(key, options ?? {}),
                )
        }
        confirmLabel={
          session.isFinishing
            ? t("Saving…")
            : finishError
              ? t("Retry")
              : t("Finish & Save")
        }
        isPending={session.isFinishing}
        confirmDisabled={finishBlocker !== null}
        cancelLabel={t("Keep training")}
        onConfirm={confirmFinish}
        onCancel={() => setShowFinishModal(false)}
      />

      <KeyboardToolbar theme={KEYBOARD_TOOLBAR_THEME}>
        <KeyboardToolbar.Done text={t("Done")} />
      </KeyboardToolbar>
    </View>
  );
}
