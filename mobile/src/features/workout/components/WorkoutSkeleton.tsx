import { View } from "react-native";
import { ScreenSkeleton } from "@/components/ui/ScreenState";
import { Skeleton } from "@/components/ui/Skeleton";

export function WorkoutSkeleton() {
  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between border-b border-border bg-surface px-md py-sm">
        <Skeleton className="h-12 w-12" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-10 w-16" />
      </View>
      <ScreenSkeleton label="Preparing your workout…">
        <View className="flex-row gap-xs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 flex-1" />
          ))}
        </View>
        <View className="gap-xs">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-32" />
        </View>
        <View className="items-center gap-md rounded-md border border-border bg-surface p-lg">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-12 w-40" />
        </View>
        <View className="gap-sm rounded-lg border border-border bg-surface p-lg">
          <View className="h-12 justify-center">
            <Skeleton className="h-7 w-16" />
          </View>
          <View className="flex-row gap-xs">
            {[0, 1, 2].map((i) => (
              <View key={i} className="flex-1 gap-xs">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-14 w-full" />
              </View>
            ))}
          </View>
          <View className="flex-row items-center justify-between py-lg">
            <View className="gap-xs">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-40" />
            </View>
            <Skeleton className="h-12 w-12" />
          </View>
          <Skeleton className="h-4 w-24" />
        </View>
        <Skeleton className="h-14 w-full" />
      </ScreenSkeleton>
    </View>
  );
}
