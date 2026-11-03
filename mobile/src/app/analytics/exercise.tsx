import { useLocalSearchParams } from "expo-router";
import { ExerciseProgressScreen } from "@/features/analytics/screens/ExerciseProgressScreen";
export default function ExerciseProgressRoute() {
  const params = useLocalSearchParams<{ exerciseId: string; name: string }>();
  return (
    <ExerciseProgressScreen
      exerciseId={
        Array.isArray(params.exerciseId)
          ? params.exerciseId[0]
          : params.exerciseId
      }
      name={Array.isArray(params.name) ? params.name[0] : params.name}
    />
  );
}
