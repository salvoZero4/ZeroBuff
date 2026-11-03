import { useLocalSearchParams } from "expo-router";
import { WorkoutDetailScreen } from "@/features/workout/screens/WorkoutDetailScreen";

export default function SessionDetailRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return (
    <WorkoutDetailScreen
      sessionId={Array.isArray(sessionId) ? sessionId[0] : sessionId}
    />
  );
}
