import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

export function RoutineCardSkeleton() {
  return (
    <View className="gap-sm py-sm">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-40" />
    </View>
  );
}
export function WeekStripSkeleton() {
  return (
    <View className="flex-row gap-xs">
      {Array.from({ length: 7 }, (_, i) => (
        <View
          key={i}
          className="min-h-16 flex-1 items-center justify-center rounded-sm border border-border bg-surface"
        >
          <Skeleton className="h-4 w-5" />
          <Skeleton className="h-7 w-5" />
        </View>
      ))}
    </View>
  );
}
export function SessionStatsSkeleton() {
  return (
    <View className="flex-row gap-sm pt-xs">
      {[0, 1, 2].map((i) => (
        <View key={i} className="flex-1 gap-xs">
          <Skeleton className="h-7 w-10 bg-border" />
          <Skeleton className="h-4 w-full bg-border" />
        </View>
      ))}
    </View>
  );
}
export function LastSessionSkeleton() {
  return (
    <View className="gap-lg py-sm">
      <View className="flex-row justify-between">
        <View className="gap-xs">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
        </View>
        <Skeleton className="h-7 w-16" />
      </View>
      <SessionStatsSkeleton />
    </View>
  );
}
export function WeightBannerSkeleton() {
  return (
    <View className="flex-row items-center gap-md border-y border-border py-md">
      <View className="flex-1 gap-xs">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-full" />
      </View>
      <Skeleton className="h-12 w-12" />
    </View>
  );
}
export function ConsistencySkeleton() {
  return (
    <View className="gap-sm">
      <Skeleton className="h-6 w-32" />
      <View className="flex-row gap-xs py-sm">
        {Array.from({ length: 8 }, (_, col) => (
          <View key={col} className="flex-1 gap-xs">
            {Array.from({ length: 7 }, (_, row) => (
              <Skeleton key={row} className="h-4 w-full" />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
