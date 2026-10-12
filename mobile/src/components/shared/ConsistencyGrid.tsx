import { memo, useCallback, useMemo, useRef, useState } from "react";
import { PixelRatio, Pressable, ScrollView, Text, View } from "react-native";

import {
  RECENT_WEEKS,
  WEEKDAY_LABELS,
  countSessions,
  findTodayWeekIndex,
  getAvailableYears,
  getMonthLabels,
  getRecentWeeks,
  getYearWeeks,
  type CalendarDay,
  type CalendarWeek,
} from "../../utils/domain/consistency";

export type ConsistencyMode = "recent" | "year";

type ConsistencyGridProps = {
  sessionDates: readonly string[];
  mode?: ConsistencyMode;

  year?: number;
  title?: string;
  showWeekdayLabels?: boolean;
};

const LABEL_WIDTH = 16;
const LABEL_GAP = 8;

const YEAR_CELL = 16;
const YEAR_GAP = 4;
const RECENT_CELL = YEAR_CELL;
const RECENT_GAP = YEAR_GAP;
const MONTH_ROW_HEIGHT = 20;

export function ConsistencyGrid({
  sessionDates,
  mode = "recent",
  year,
  title = "Consistency",
  showWeekdayLabels = false,
}: ConsistencyGridProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(year ?? currentYear);

  const sessionDateSet = useMemo(() => new Set(sessionDates), [sessionDates]);
  const availableYears = useMemo(
    () => getAvailableYears(sessionDates, currentYear, year),
    [sessionDates, currentYear, year],
  );
  const weeks = useMemo(
    () =>
      mode === "recent"
        ? getRecentWeeks(sessionDateSet)
        : getYearWeeks(selectedYear, sessionDateSet),
    [mode, selectedYear, sessionDateSet],
  );
  const sessionCount = useMemo(() => countSessions(weeks), [weeks]);

  const period =
    mode === "recent" ? `last ${RECENT_WEEKS} weeks` : String(selectedYear);
  const accessibilityLabel = `${sessionCount} ${
    sessionCount === 1 ? "workout" : "workouts"
  }, ${period}`;

  return (
    <View className="gap-sm">
      <View className="flex-row items-center justify-between">
        <Text className="font-body-semibold text-body text-text-primary">
          {title}
        </Text>
        {mode === "year" ? (
          <YearPicker
            years={availableYears}
            selected={selectedYear}
            onSelect={setSelectedYear}
          />
        ) : (
          <Text className="font-body text-caption text-text-secondary">
            {`Last ${RECENT_WEEKS} weeks`}
          </Text>
        )}
      </View>

      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        className="rounded-md border border-border bg-surface p-lg"
      >
        {mode === "recent" ? (
          <RecentGrid weeks={weeks} showWeekdayLabels={showWeekdayLabels} />
        ) : (
          <YearGrid
            key={selectedYear}
            weeks={weeks}
            year={selectedYear}
            showWeekdayLabels={showWeekdayLabels}
          />
        )}
      </View>
    </View>
  );
}

function RecentGrid({
  weeks,
  showWeekdayLabels,
}: {
  weeks: readonly CalendarWeek[];
  showWeekdayLabels: boolean;
}) {
  const [areaWidth, setAreaWidth] = useState(0);

  const pixelRatio = PixelRatio.get();
  const cellWidth =
    areaWidth === 0
      ? 0
      : Math.floor(
          ((areaWidth - RECENT_GAP * (weeks.length - 1)) / weeks.length) *
            pixelRatio,
        ) / pixelRatio;
  const cellHeight = RECENT_CELL;

  return (
    <View style={{ flexDirection: "row" }}>
      {showWeekdayLabels && (
        <WeekdayLabels cellHeight={cellHeight} gap={RECENT_GAP} />
      )}
      <View
        style={{ flex: 1 }}
        onLayout={(event) => setAreaWidth(event.nativeEvent.layout.width)}
      >
        {cellWidth > 0 && (
          <WeekColumns
            weeks={weeks}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            gap={RECENT_GAP}
          />
        )}
      </View>
    </View>
  );
}

function YearGrid({
  weeks,
  year,
  showWeekdayLabels,
}: {
  weeks: readonly CalendarWeek[];
  year: number;
  showWeekdayLabels: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const viewportWidth = useRef(0);
  const todayWeekIndex = useMemo(() => findTodayWeekIndex(weeks), [weeks]);
  const monthLabels = useMemo(() => getMonthLabels(year, weeks), [year, weeks]);
  const stride = YEAR_CELL + YEAR_GAP;

  const scrollToToday = useCallback(() => {
    if (viewportWidth.current === 0) return;
    const x =
      todayWeekIndex === -1
        ? 0
        : Math.max(
            0,
            (todayWeekIndex + 1) * stride - YEAR_GAP - viewportWidth.current,
          );
    scrollRef.current?.scrollTo({ x, animated: false });
  }, [todayWeekIndex, stride]);

  return (
    <View style={{ flexDirection: "row" }}>
      {showWeekdayLabels && (
        <WeekdayLabels
          cellHeight={YEAR_CELL}
          gap={YEAR_GAP}
          topOffset={MONTH_ROW_HEIGHT}
        />
      )}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        style={{ flex: 1 }}
        onLayout={(event) => {
          viewportWidth.current = event.nativeEvent.layout.width;
          scrollToToday();
        }}
        onContentSizeChange={scrollToToday}
      >
        <View>
          <View style={{ height: MONTH_ROW_HEIGHT }}>
            {monthLabels.map(({ label, weekIndex }) => (
              <Text
                key={label}
                numberOfLines={1}
                maxFontSizeMultiplier={1}
                className="font-body text-caption text-text-secondary"
                style={{
                  position: "absolute",
                  left: weekIndex * stride,
                  includeFontPadding: false,
                }}
              >
                {label}
              </Text>
            ))}
          </View>
          <WeekColumns
            weeks={weeks}
            cellWidth={YEAR_CELL}
            cellHeight={YEAR_CELL}
            gap={YEAR_GAP}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function WeekdayLabels({
  cellHeight,
  gap,
  topOffset = 0,
}: {
  cellHeight: number;
  gap: number;
  topOffset?: number;
}) {
  return (
    <View
      style={{
        width: LABEL_WIDTH,
        marginRight: LABEL_GAP,
        marginTop: topOffset,
        gap,
      }}
    >
      {WEEKDAY_LABELS.map((label, index) => (
        <View
          key={index}
          style={{
            height: cellHeight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            className="font-body-bold text-caption text-text-secondary"
            maxFontSizeMultiplier={1}
            style={{ includeFontPadding: false, textAlignVertical: "center" }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function WeekColumns({
  weeks,
  cellWidth,
  cellHeight,
  gap,
}: {
  weeks: readonly CalendarWeek[];
  cellWidth: number;
  cellHeight: number;
  gap: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap }}>
      {weeks.map((week) => (
        <View key={week[0].date} style={{ gap }}>
          {week.map((day) => (
            <ConsistencyDay
              key={day.date}
              day={day}
              width={cellWidth}
              height={cellHeight}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const ConsistencyDay = memo(function ConsistencyDay({
  day,
  width,
  height,
}: {
  day: CalendarDay;
  width: number;
  height: number;
}) {
  if (!day.inRange) {
    return <View style={{ width, height }} />;
  }

  const fill = day.hasSession ? "bg-accent" : "bg-surface-raised";
  const future = day.isFuture ? "opacity-30" : "";
  const ring = day.isToday ? "border-2 border-accent-pressed" : "";

  return (
    <View
      style={{
        width,
        height,
        borderRadius: Math.max(3, Math.round(Math.min(width, height) * 0.28)),
      }}
      className={`${fill} ${future} ${ring}`}
    />
  );
});

function YearPicker({
  years,
  selected,
  onSelect,
}: {
  years: readonly number[];
  selected: number;
  onSelect: (year: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 1, marginLeft: 12 }}
      contentContainerClassName="gap-xs"
    >
      {years.map((year) => {
        const isSelected = year === selected;

        return (
          <Pressable
            key={year}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            hitSlop={12}
            className={`rounded-sm px-sm py-xs ${isSelected ? "bg-accent" : "bg-surface-raised"}`}
            onPress={() => onSelect(year)}
          >
            <Text
              className={`font-body-semibold text-caption ${
                isSelected ? "text-on-accent" : "text-text-secondary"
              }`}
            >
              {year}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
