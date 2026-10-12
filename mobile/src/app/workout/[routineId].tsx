import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getRoutine } from "@/utils/api/routines";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ExerciseStepPill } from "@/components/workout/ExerciseStepPill";
import { WorkoutSetRow } from "@/components/workout/WorkoutSetRow";
import { RestTimerControl } from "@/components/workout/RestTimerControl";
import { SessionHeader } from "@/components/workout/SessionHeader";
import {
  useActiveWorkout,
  initOrResumeWorkout,
  toggleWorkoutPause,
  tickWorkoutDuration,
  setCurrentExerciseIndex,
  createSetLog,
  updateSetLog,
  addSetToExercise,
  finishWorkoutSession,
} from "@/utils/stores/activeWorkoutStore";

export default function ActiveWorkoutScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const resolvedId = Array.isArray(routineId) ? routineId[0] : routineId;

  // 1. Fetch reale della routine dal server tramite React Query
  const {
    data: routine,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["routines", resolvedId],
    queryFn: () => getRoutine(resolvedId ?? ""),
    enabled: !!resolvedId,
  });

  const session = useActiveWorkout();
  const [showFinishModal, setShowFinishModal] = useState(false);

  useEffect(() => {
    if (routine) {
      initOrResumeWorkout(routine);
    }
  }, [routine]);

  useEffect(() => {
    const interval = setInterval(() => {
      tickWorkoutDuration();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#E2F163" />
      </View>
    );
  }

  if (isError || !routine || !session) {
    return (
      <View className="flex-1 items-center justify-center gap-md bg-bg p-lg">
        <Text className="font-body-bold text-xl text-text-primary">
          Routine not found
        </Text>
        <Button
          variant="outline"
          label="Go back"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const activeExercise = routine.exercises[session.currentExerciseIndex];
  const activeExerciseLogs =
    session.workoutLogs[activeExercise.exercise_id] ?? [];
  const isLastExercise =
    session.currentExerciseIndex === routine.exercises.length - 1;

  function handleToggleComplete(setIndex: number) {
    const current = activeExerciseLogs[setIndex];
    if (!current.completed) {
      createSetLog(activeExercise.exercise_id, setIndex);
    } else {
      updateSetLog(activeExercise.exercise_id, setIndex, { completed: false });
    }
  }

  async function confirmFinish() {
    setShowFinishModal(false);
    await finishWorkoutSession();
    router.replace("/(tabs)");
  }

  return (
    <View className="flex-1 bg-bg">
      <SessionHeader
        durationSeconds={session.durationSeconds}
        isPaused={session.isPaused}
        onBack={() => router.back()}
        onTogglePause={toggleWorkoutPause}
        onFinish={() => setShowFinishModal(true)}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* Step Pills degli Esercizi */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-xs"
        >
          {routine.exercises.map((ex, idx) => {
            const logs = session.workoutLogs[ex.exercise_id] ?? [];
            const isCompleted =
              logs.length > 0 && logs.every((s) => s.completed);
            return (
              <ExerciseStepPill
                key={ex.exercise_id}
                index={idx}
                name={ex.name}
                isActive={idx === session.currentExerciseIndex}
                isCompleted={isCompleted}
                onPress={() => setCurrentExerciseIndex(idx)}
              />
            );
          })}
        </ScrollView>

        <View className="gap-xs">
          <Text className="font-body-bold text-title text-text-primary">
            {activeExercise.name}
          </Text>
          <Text className="font-body text-caption text-text-secondary">
            Exercise {session.currentExerciseIndex + 1} of{" "}
            {routine.exercises.length}
          </Text>
        </View>

        <RestTimerControl defaultSeconds={activeExercise.rest_time} />

        <Card className="gap-md">
          <View className="flex-row px-xs">
            <Text className="w-7 text-center font-body-semibold text-caption text-text-secondary">
              Set
            </Text>
            <Text className="flex-1 text-center font-body-semibold text-caption text-text-secondary">
              Kg
            </Text>
            <Text className="flex-1 text-center font-body-semibold text-caption text-text-secondary">
              Reps
            </Text>
            <Text className="w-16 text-center font-body-semibold text-caption text-text-secondary">
              RIR
            </Text>
            <View className="w-11 items-center">
              <Text className="font-body-semibold text-caption text-text-secondary">
                Done
              </Text>
            </View>
          </View>

          <View className="gap-xs">
            {activeExerciseLogs.map((setLog, setIdx) => (
              <WorkoutSetRow
                key={setLog.setNumber}
                set={setLog}
                onUpdate={(changes) =>
                  updateSetLog(activeExercise.exercise_id, setIdx, changes)
                }
                onToggleComplete={() => handleToggleComplete(setIdx)}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              addSetToExercise(activeExercise.exercise_id, activeExercise.reps)
            }
            className="min-h-12 flex-row items-center justify-center gap-xs rounded-sm border border-border bg-surface-raised active:bg-surface"
          >
            <Icon name="plus" size={14} className="text-text-primary" />
            <Text className="font-body-semibold text-caption text-text-primary">
              Add set
            </Text>
          </Pressable>
        </Card>
      </ScrollView>

      {/* Barra comandi inferiore */}
      <View className="absolute bottom-6 left-lg right-lg flex-row gap-md">
        {session.currentExerciseIndex > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setCurrentExerciseIndex(session.currentExerciseIndex - 1)
            }
            className="min-h-14 flex-1 items-center justify-center rounded-sm border border-border bg-surface active:bg-surface-raised"
          >
            <Text className="font-body-semibold text-body text-text-primary">
              Previous
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (isLastExercise) {
              setShowFinishModal(true);
            } else {
              setCurrentExerciseIndex(session.currentExerciseIndex + 1);
            }
          }}
          className="min-h-14 flex-1 items-center justify-center rounded-sm bg-accent active:bg-accent-pressed"
        >
          <Text className="font-body-bold text-body text-on-accent">
            {isLastExercise ? "Complete workout" : "Next exercise"}
          </Text>
        </Pressable>
      </View>

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
