import { View } from "react-native";
import { ScreenSkeleton } from "@/components/ui/ScreenState";
import { Skeleton } from "@/components/ui/Skeleton";

export function WorkoutSkeleton() {
  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between border-b border-border px-md py-xs">
        <Skeleton className="h-12 w-12" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-12" />
      </View>
      <ScreenSkeleton label="Preparing your workout…">
        <View className="flex-row gap-xs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 flex-1" />
          ))}
        </View>
        <Skeleton className="h-7 w-48" />
        <View className="items-center gap-sm py-md">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-24 w-40" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-32" />
        </View>
        <View className="gap-sm rounded-lg border border-border bg-surface p-lg">
          <View className="flex-row items-center justify-between">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-12 w-12" />
          </View>
          <View className="flex-row items-end gap-sm">
            {[0, 1].map((i) => (
              <View key={i} className="flex-1 gap-xs">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-16 w-full" />
              </View>
            ))}
            <Skeleton className="h-16 w-14" />
          </View>
          <View className="flex-row items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-12 w-12" />
          </View>
        </View>
      </ScreenSkeleton>
      <View className="p-lg">
        <Skeleton className="h-14 w-full" />
      </View>
    </View>
  );
}
