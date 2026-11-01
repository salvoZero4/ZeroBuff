import { WorkoutScreen } from "@/features/workout/screens/WorkoutScreen";
import { useLocalSearchParams } from "expo-router";

export default function WorkoutRoute() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const resolvedId = Array.isArray(routineId) ? routineId[0] : routineId;

  return <WorkoutScreen routineId={resolvedId} />;
}
