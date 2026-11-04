import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sessionKeys } from "@/features/workout/api/queryKeys";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  getSessionDetails,
  deleteSetLogApi,
} from "@/features/workout/api/session";
import type { SetLogRead } from "@/features/workout/types/session";
import { WEIGHT_UNIT } from "@/features/workout/utils/experience";
import {
  SetEditor,
  type SetEditorTarget,
} from "@/features/analytics/components/SetEditor";
import { ExercisePicker } from "@/features/analytics/components/ExercisePicker";
import { QueryNotice } from "@/features/analytics/components/AnalyticsControls";
import { useRefreshTraining } from "@/features/analytics/hooks/useAnalytics";
import { dateLabel, numberLabel } from "@/features/analytics/utils/progress";
export function WorkoutDetailScreen({ sessionId }: { sessionId: string }) {
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState(false);
  const [target, setTarget] = useState<SetEditorTarget | null>(null);
  const [removing, setRemoving] = useState<SetLogRead | null>(null);
  const refresh = useRefreshTraining();
  const query = useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => getSessionDetails(sessionId),
    enabled: !!sessionId,
  });
  const data = query.data;
  const remove = useMutation({
    mutationFn: (id: string) => deleteSetLogApi(sessionId, id),
    onSuccess: () => {
      setRemoving(null);
      void refresh();
    },
    onError: (error: Error) => {
      setRemoving(null);
      Alert.alert("Could not delete set", error.message);
    },
    onSettled: () => {
      void refresh();
    },
  });
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/analytics");
  }
  const exerciseIds = [...new Set(data?.sets.map((s) => s.exercise_id) ?? [])];
  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerClassName="gap-xl p-lg"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="flex-row items-center gap-md">
          <IconButton icon="arrow-left" label="Back" onPress={back} />
          <View className="flex-1">
            <ScreenHeader
              title="Session details"
              subtitle={
                data
                  ? `${dateLabel(data.date)} · ${exerciseIds.length} exercises · ${data.sets.length} sets`
                  : ""
              }
            />
          </View>
          {data?.status === "completed" && (
            <IconButton
              icon={editing ? "check" : "pen-to-square"}
              label={editing ? "Done editing session" : "Edit session"}
              onPress={() => setEditing(!editing)}
            />
          )}
        </View>
        <QueryNotice
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
        {data && (
          <>
            {data.status !== "completed" && (
              <Button
                label="Go to Today to resume"
                variant="outline"
                onPress={() => router.replace("/(tabs)")}
              />
            )}
            {editing && (
              <Text className="font-body text-sm text-text-secondary">
                Tap a set to correct it. Each change is saved separately.
              </Text>
            )}
            {exerciseIds.map((id) => {
              const sets = data.sets
                .filter((s) => s.exercise_id === id)
                .sort((a, b) => a.set_number - b.set_number);
              return (
                <View key={id} className="gap-sm border-t border-border pt-lg">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/analytics/exercise",
                        params: { exerciseId: id, name: sets[0].exercise_name },
                      })
                    }
                    className="min-h-12 flex-row items-center gap-md"
                  >
                    <Text className="flex-1 font-body-semibold text-xl text-text-primary">
                      {sets[0].exercise_name}
                    </Text>
                    <Icon
                      name="chevron-right"
                      size={16}
                      className="text-text-secondary"
                    />
                  </Pressable>
                  <View className="flex-row gap-sm">
                    <Text className="w-12 font-body text-caption text-text-secondary">
                      SET
                    </Text>
                    <Text className="flex-1 font-body text-caption text-text-secondary">
                      LOAD × REPS
                    </Text>
                    <Text className="w-12 font-body text-caption text-text-secondary">
                      RIR
                    </Text>
                    {editing && <View className="w-12" />}
                  </View>
                  {sets.map((set) => (
                    <View key={set.id} className="flex-row items-center">
                      <Pressable
                        disabled={!editing}
                        accessibilityRole={editing ? "button" : undefined}
                        accessibilityLabel={`Edit set ${set.set_number}, ${set.weight} ${WEIGHT_UNIT}, ${set.reps} reps, RIR ${set.rir ?? "not recorded"}`}
                        onPress={() =>
                          setTarget({
                            exerciseId: id,
                            name: set.exercise_name,
                            number: set.set_number,
                            set,
                          })
                        }
                        className="min-h-14 flex-1 flex-row items-center gap-sm border-b border-border"
                      >
                        <Text className="w-12 font-numeric text-xl text-text-secondary">
                          {set.set_number}
                        </Text>
                        <Text className="flex-1 font-numeric text-xl text-text-primary">
                          {numberLabel(set.weight)} {WEIGHT_UNIT} × {set.reps}
                        </Text>
                        <Text className="w-12 font-numeric text-xl text-text-secondary">
                          {set.rir ?? "—"}
                        </Text>
                      </Pressable>
                      {editing && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete set ${set.set_number}`}
                          onPress={() => setRemoving(set)}
                          className="min-h-12 w-12 items-center justify-center"
                        >
                          <Icon
                            name="trash"
                            size={16}
                            className="text-text-secondary"
                          />
                        </Pressable>
                      )}
                    </View>
                  ))}
                  {editing && (
                    <Button
                      label="Add set"
                      variant="outline"
                      onPress={() =>
                        setTarget({
                          exerciseId: id,
                          name: sets[0].exercise_name,
                          number:
                            Math.max(...sets.map((s) => s.set_number)) + 1,
                        })
                      }
                    />
                  )}
                </View>
              );
            })}
            {!data.sets.length && (
              <Text className="font-body text-body text-text-secondary">
                No sets recorded. Edit this session to add your first exercise.
              </Text>
            )}
            {editing && (
              <Button
                label="Add exercise"
                icon="plus"
                onPress={() => setPicker(true)}
              />
            )}
          </>
        )}
      </ScrollView>
      {picker && (
        <ExercisePicker
          onClose={() => setPicker(false)}
          onSelect={(exercise) => {
            setPicker(false);
            setTarget({
              exerciseId: exercise.id,
              name: exercise.name,
              number:
                Math.max(
                  0,
                  ...(data?.sets
                    .filter((s) => s.exercise_id === exercise.id)
                    .map((s) => s.set_number) ?? []),
                ) + 1,
            });
          }}
        />
      )}
      {target && (
        <SetEditor
          sessionId={sessionId}
          target={target}
          sets={data?.sets ?? []}
          onClose={() => setTarget(null)}
        />
      )}
      <ConfirmModal
        visible={!!removing}
        title="Delete set?"
        description="This set will be removed from the session and its progress statistics."
        isDestructive
        isPending={remove.isPending}
        confirmLabel={remove.isPending ? "Deleting…" : "Delete set"}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
        onCancel={() => setRemoving(null)}
      />
    </View>
  );
}
