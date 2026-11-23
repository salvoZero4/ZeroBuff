import { Redirect, useLocalSearchParams } from "expo-router";
import { ExerciseDetailScreen } from "@/features/exercises/screens/ExerciseDetailScreen";

export default function ExerciseDetailRoute() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  if (
    !exerciseId ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(exerciseId)
  ) {
    return <Redirect href="/my-exercises" />;
  }
  return <ExerciseDetailScreen key={exerciseId} exerciseId={exerciseId} />;
}
