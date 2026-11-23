import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { LoadingNotice } from "@/components/ui/ScreenState";
import { loadErrorMessage } from "@/shared/api/loadError";
import { getExercises } from "../api/exercise";
import { exerciseKeys } from "../api/queryKeys";
import { ExerciseListRow } from "../components/ExerciseListRow";

const params = { mine: true, limit: 20 };

export function MyExercisesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const exercises = useInfiniteQuery({
    queryKey: exerciseKeys.infiniteList(params),
    queryFn: ({ pageParam }) => getExercises({ ...params, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (page, pages) =>
      page.length === params.limit ? pages.length * params.limit : undefined,
  });
  const rows = exercises.data?.pages.flat() ?? [];

  return (
    <View className="flex-1 bg-bg p-lg">
      <View className="mb-md flex-row items-center gap-md">
        <IconButton
          icon="arrow-left"
          label={t("Back to Profile")}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/profile")
          }
        />
        <Text
          accessibilityRole="header"
          className="flex-1 font-body-bold text-title text-text-primary"
        >
          {t("My exercises")}
        </Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(exercise) => exercise.id}
        refreshing={exercises.isRefetching}
        onRefresh={() => void exercises.refetch()}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        renderItem={({ item, index }) => (
          <ExerciseListRow
            action="detail"
            name={item.name}
            detail={`${t(`exercise.${item.muscle_group}`)} · ${t(`exercise.${item.equipment}`)}`}
            isLast={index === rows.length - 1}
            onPress={() =>
              router.push({
                pathname: "/my-exercises/[exerciseId]",
                params: { exerciseId: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          exercises.isPaused ? (
            <Text className="font-body text-body text-text-secondary">
              {t(
                "We couldn’t connect. Check your internet connection and try again.",
              )}
            </Text>
          ) : exercises.isPending ? (
            <LoadingNotice label="Loading your exercises…" />
          ) : exercises.isError ? undefined : (
            <Text className="font-body text-body text-text-secondary">
              {t("You haven’t created any exercises yet.")}
            </Text>
          )
        }
        ListFooterComponent={
          <View className="gap-sm">
            {exercises.error && (
              <Text
                accessibilityRole="alert"
                className="font-body text-caption text-danger"
              >
                {t(loadErrorMessage(exercises.error))}
              </Text>
            )}
            {exercises.isError && !exercises.isFetchNextPageError ? (
              <Button
                variant="outline"
                label={t("Try again")}
                disabled={exercises.isFetching || exercises.isPaused}
                onPress={() => void exercises.refetch()}
              />
            ) : (
              exercises.hasNextPage && (
                <Button
                  variant="outline"
                  label={t(
                    exercises.isFetchingNextPage
                      ? "Loading your exercises…"
                      : exercises.isFetchNextPageError
                        ? "Try again"
                        : "Load more",
                  )}
                  disabled={exercises.isFetching || exercises.isPaused}
                  onPress={() =>
                    void exercises.fetchNextPage({ cancelRefetch: false })
                  }
                />
              )
            )}
          </View>
        }
      />
    </View>
  );
}
