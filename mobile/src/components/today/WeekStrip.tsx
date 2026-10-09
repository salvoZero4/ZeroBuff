import { View } from "react-native";
import { getWeekDays } from "@/utils/dates";
import { WeekDayTile } from "./WeekDayTile";

type WeekStripProps = {
  weekDays?: ReturnType<typeof getWeekDays>;
  hasRoutine?: (date: string, dayIndex: number) => boolean;
};

export function WeekStrip({ weekDays, hasRoutine }: WeekStripProps) {
  const days = weekDays ?? getWeekDays();

  return (
    <View className="flex-row gap-xs rounded-md">
      {days.map((day, index) => (
        <WeekDayTile
          key={day.date}
          label={day.label}
          number={day.number}
          isToday={day.isToday}
          hasRoutine={hasRoutine ? hasRoutine(day.date, index) : false}
        />
      ))}
    </View>
  );
}
