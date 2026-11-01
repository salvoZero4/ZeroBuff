import { RoutineDetailScreen } from "@/features/routines/screens/RoutineDetailScreen";
import { useLocalSearchParams } from "expo-router";

export default function RoutineDetailRoute() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const resolvedRoutineId = Array.isArray(routineId) ? routineId[0] : routineId;

  return <RoutineDetailScreen routineId={resolvedRoutineId ?? "new"} />;
}
