import { useLocalSearchParams } from "expo-router";

import { RoutineDetailScreen } from "@/components/routines/RoutineDetailScreen";

export default function RoutineDetailRoute() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const resolvedRoutineId = Array.isArray(routineId) ? routineId[0] : routineId;

  return <RoutineDetailScreen routineId={resolvedRoutineId ?? "new"} />;
}

