import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  chartGeometry,
  dateLabel,
  numberLabel,
  type Point,
} from "../utils/progress";
import { Icon } from "@/components/ui/Icon";

export function ProgressChart({
  points,
  unit,
  onOpen,
  pointName = "measurement",
}: {
  points: Point[];
  unit: string;
  onOpen?: (id: string) => void;
  pointName?: "measurement" | "weekly average";
}) {
  const [width, setWidth] = useState(240);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!points.length)
    return (
      <Text className="py-xl font-body text-body text-text-secondary">
        No measurements in this period.
      </Text>
    );
  if (points.length === 1) {
    const point = points[0];
    return (
      <View className="gap-sm border-b border-border py-lg">
        <Text className="font-numeric text-title text-text-primary">
          {numberLabel(point.value)}{" "}
          <Text className="font-body text-body text-text-secondary">
            {unit}
          </Text>
        </Text>
        <Text className="font-body text-sm text-text-secondary">
          {point.label ?? dateLabel(point.date)}
        </Text>
        <Text className="font-body text-caption text-text-secondary">
          {pointName === "weekly average"
            ? "Log weight in another week to compare averages."
            : "One measurement. A trend will appear after more records are added."}
        </Text>
        {onOpen && (
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpen(point.id)}
            className="min-h-12 justify-center"
          >
            <Text className="font-body-semibold text-sm text-text-primary">
              Open selected session
            </Text>
          </Pressable>
        )}
      </View>
    );
  }
  const selectedIndex = points.findIndex((p) => p.id === selectedId);
  const selected = selectedIndex === -1 ? points.length - 1 : selectedIndex;
  const point = points[selected];
  const geometry = chartGeometry(points, width, 160);
  function selectAt(x: number) {
    const nearest = geometry.points.reduce(
      (best, p, i) =>
        Math.abs(p.x - x) < Math.abs(geometry.points[best].x - x) ? i : best,
      0,
    );
    setSelectedId(points[nearest].id);
  }
  return (
    <View className="gap-sm py-lg">
      <View className="flex-row items-center justify-between gap-md">
        <View className="flex-1">
          <Text className="font-numeric text-title text-text-primary">
            {numberLabel(point.value)}{" "}
            <Text className="font-body text-body text-text-secondary">
              {unit}
            </Text>
          </Text>
          <Text className="font-body text-caption text-text-secondary">
            {point.label ?? dateLabel(point.date)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Previous ${pointName}`}
          disabled={selected === 0}
          onPress={() => setSelectedId(points[selected - 1].id)}
          className="min-h-12 min-w-12 items-center justify-center"
        >
          <Icon
            name="chevron-left"
            size={16}
            className={
              selected === 0 ? "text-text-disabled" : "text-text-primary"
            }
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Next ${pointName}`}
          disabled={selected === points.length - 1}
          onPress={() => setSelectedId(points[selected + 1].id)}
          className="min-h-12 min-w-12 items-center justify-center"
        >
          <Icon
            name="chevron-right"
            size={16}
            className={
              selected === points.length - 1
                ? "text-text-disabled"
                : "text-text-primary"
            }
          />
        </Pressable>
      </View>
      <View className="flex-row gap-md py-md">
        <View className="justify-between" style={{ height: 160 }}>
          <Text className="font-numeric text-caption text-text-secondary">
            {numberLabel(geometry.max)}
          </Text>
          <Text className="font-numeric text-caption text-text-secondary">
            {numberLabel(geometry.min)}
          </Text>
        </View>
        <View
          className="flex-1 mx-xs"
          style={{ height: 160 }}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(event) => selectAt(event.nativeEvent.locationX)}
          accessibilityLabel={`Progress chart. Use previous and next ${pointName} buttons to inspect values.`}
        >
          {[0, 80, 160].map((top) => (
            <View
              key={top}
              className="absolute w-full border-t border-border"
              style={{ top }}
            />
          ))}
          {geometry.points.slice(1).map((p, i) => {
            const previous = geometry.points[i],
              dx = p.x - previous.x,
              dy = p.y - previous.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            return (
              <View
                key={`line-${p.id}`}
                pointerEvents="none"
                className="absolute bg-text-secondary"
                style={{
                  height: 1,
                  width: length,
                  left: (previous.x + p.x - length) / 2,
                  top: (previous.y + p.y) / 2,
                  transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                }}
              />
            );
          })}
          {geometry.points.map((p, i) => (
            <View
              key={p.id}
              pointerEvents="none"
              className={`absolute rounded-full ${i === selected ? "bg-accent" : "bg-text-secondary"}`}
              style={{
                width: i === selected ? 8 : 4,
                height: i === selected ? 8 : 4,
                left: p.x - (i === selected ? 4 : 2),
                top: p.y - (i === selected ? 4 : 2),
              }}
            />
          ))}
        </View>
      </View>
      <View className="flex-row justify-between">
        <Text className="font-body text-caption text-text-secondary">
          {dateLabel(points[0].date)}
        </Text>
        <Text className="font-body text-caption text-text-secondary">
          {points.length > 1
            ? dateLabel(points[points.length - 1].date)
            : "One measurement"}
        </Text>
      </View>
      {onOpen && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen(point.id)}
          className="min-h-12 justify-center"
        >
          <Text className="font-body-semibold text-sm text-text-primary">
            Open selected session
          </Text>
        </Pressable>
      )}
    </View>
  );
}
