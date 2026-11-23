import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { IconButton } from "@/components/ui/IconButton";
import { LoadingNotice } from "@/components/ui/ScreenState";
import { useAuth } from "@/features/auth/provider/AuthProvider";
import { userKeys } from "@/features/profile/api/queryKeys";
import { getCurrentUser } from "@/features/profile/api/user";
import { ApiError } from "@/shared/api/errors";
import { loadErrorMessage } from "@/shared/api/loadError";
import { errorText } from "@/shared/i18n/errors";
import { deleteExercise, getExercise } from "../api/exercise";
import { exerciseKeys } from "../api/queryKeys";
import { ExerciseFormModal } from "../components/CreateExerciseModal";

function backToList() {
  router.dismissTo("/my-exercises");
}

export function ExerciseDetailScreen({ exerciseId }: { exerciseId: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { accountId } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleting = useRef(false);

  const detail = useQuery({
    queryKey: exerciseKeys.detail(exerciseId),
    queryFn: () => getExercise(exerciseId),
  });
  const user = useQuery({
    queryKey: userKeys.me(),
    queryFn: getCurrentUser,
    enabled: !accountId,
  });
  const ownerId = accountId ?? user.data?.id;
  const exercise = detail.data;
  const missing =
    detail.error instanceof ApiError && detail.error.status === 404;
  const loadError =
    (!exercise ? detail.error : null) ?? (!ownerId ? user.error : null);
  const canManage = exercise && ownerId && exercise.created_by_user === ownerId;

  const leaveUnavailable = useCallback(() => {
    queryClient.removeQueries({ queryKey: exerciseKeys.detail(exerciseId) });
    void queryClient.invalidateQueries({
      queryKey: exerciseKeys.infiniteLists(),
    });
    backToList();
  }, [exerciseId, queryClient]);

  useEffect(() => {
    if (missing) leaveUnavailable();
  }, [missing, leaveUnavailable]);

  const deletion = useMutation({
    mutationFn: () => deleteExercise(exerciseId),
    onSuccess: leaveUnavailable,
    onError: (error) => {
      setConfirming(false);
      if (error instanceof ApiError && error.status === 404) {
        leaveUnavailable();
        return;
      }
      setDeleteError(
        error instanceof ApiError && error.status === 409
          ? t(
              "This exercise is used in a routine or a logged workout and can’t be deleted.",
            )
          : errorText(error, "Failed to delete exercise."),
      );
    },
    onSettled: () => {
      deleting.current = false;
    },
  });

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-lg p-lg"
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <View className="flex-row items-center gap-md">
        <IconButton
          icon="arrow-left"
          label={t("Back to my exercises")}
          onPress={backToList}
        />
        <Text
          accessibilityRole="header"
          className="flex-1 font-body-bold text-title text-text-primary"
        >
          {canManage && !missing ? exercise.name : t("Exercise details")}
        </Text>
      </View>

      {missing ? null : loadError ? (
        <View className="gap-sm">
          <Text
            accessibilityRole="alert"
            className="font-body text-body text-text-secondary"
          >
            {t(loadErrorMessage(loadError))}
          </Text>
          <Button
            variant="outline"
            label={t("Try again")}
            disabled={detail.isFetching || user.isFetching}
            onPress={() => {
              if (detail.isError) void detail.refetch();
              if (!ownerId && user.isError) void user.refetch();
            }}
          />
        </View>
      ) : (!exercise && detail.isPaused) || (!ownerId && user.isPaused) ? (
        <Text className="font-body text-body text-text-secondary">
          {t(
            "We couldn’t connect. Check your internet connection and try again.",
          )}
        </Text>
      ) : !exercise || !ownerId ? (
        <LoadingNotice label="Loading exercise…" />
      ) : !canManage ? (
        <Text
          accessibilityRole="alert"
          className="font-body text-body text-text-secondary"
        >
          {t("You don’t have access to this information.")}
        </Text>
      ) : (
        <>
          <DetailField
            label={t("Primary muscle group")}
            value={t(`exercise.${exercise.muscle_group}`)}
          />
          <DetailField
            label={t("Secondary muscles")}
            value={
              exercise.secondary_muscle_groups?.length
                ? exercise.secondary_muscle_groups
                    .map((muscle) => t(`exercise.${muscle}`))
                    .join(", ")
                : t("None selected")
            }
          />
          <DetailField
            label={t("Equipment")}
            value={t(`exercise.${exercise.equipment}`)}
          />
          <View className="gap-sm">
            <Button
              label={t("Edit exercise")}
              onPress={() => {
                setDeleteError(null);
                setEditing(true);
              }}
            />
            {deleteError && (
              <Text
                accessibilityRole="alert"
                className="font-body text-caption text-danger"
              >
                {deleteError}
              </Text>
            )}
            <Button
              label={t("Delete exercise")}
              variant="danger"
              onPress={() => {
                setDeleteError(null);
                setConfirming(true);
              }}
            />
          </View>
          {editing && (
            <ExerciseFormModal
              visible
              exercise={exercise}
              onClose={() => setEditing(false)}
              onUnavailable={leaveUnavailable}
            />
          )}
          {confirming && (
            <ConfirmModal
              visible
              isDestructive
              isPending={deletion.isPending}
              title={t("Delete exercise")}
              description={t("Delete {{name}} from the exercise catalog?", {
                name: exercise.name,
              })}
              confirmLabel={t("Delete exercise")}
              onConfirm={() => {
                if (deleting.current) return;
                deleting.current = true;
                deletion.mutate();
              }}
              onCancel={() => {
                if (!deleting.current) setConfirming(false);
              }}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-xs border-b border-border pb-md">
      <Text className="font-body-semibold text-caption text-text-secondary">
        {label}
      </Text>
      <Text className="font-body text-body text-text-primary">{value}</Text>
    </View>
  );
}
