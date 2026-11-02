import { View } from "react-native";
import { ScreenSkeleton } from "@/components/ui/ScreenState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";

export function AnalyticsSkeleton() {
  return (
    <ScreenSkeleton label="Loading workout history…">
      <View className="pb-sm">
        <ScreenHeader
          title="Analytics"
          subtitle="Review your workout history"
        />
      </View>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          className="flex-row items-center justify-between rounded-md border border-border bg-surface p-lg"
        >
          <View className="flex-1 gap-xs pr-md">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-32" />
          </View>
          <Skeleton className="h-10 w-10" />
        </View>
      ))}
    </ScreenSkeleton>
  );
}
