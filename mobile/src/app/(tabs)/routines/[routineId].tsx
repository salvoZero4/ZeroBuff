import { RoutineDetailScreen } from "@/features/routines/screens/RoutineDetailScreen";
import { useLocalSearchParams } from "expo-router";

export default function RoutineDetailRoute() {
  const { routineId, fromWorkout } = useLocalSearchParams<{
    routineId: string;
    fromWorkout?: string;
  }>();
  const resolvedRoutineId = Array.isArray(routineId) ? routineId[0] : routineId;

  return (
    <RoutineDetailScreen
      routineId={resolvedRoutineId ?? "new"}
      offerWorkoutAfterSave={fromWorkout === "true"}
    />
  );
}
