export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getWeekDays(date: Date = new Date()) {
  const mondayOffset = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);

    return {
      date: toLocalDateString(day),
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "narrow",
      }).format(day),
      number: day.getDate(),
      isToday: toLocalDateString(day) === toLocalDateString(date),
    };
  });
}

export type DatePart = "day" | "month" | "year";

// Preserve a valid calendar day across shorter months and leap years.
export function changeDatePart(
  value: string,
  part: DatePart,
  next: number,
  maxDate: string,
): string {
  let [year, month, day] = value.split("-").map(Number);
  if (part === "year") year = next;
  if (part === "month") month = next;
  if (part === "day") day = next;
  day = Math.min(day, new Date(year, month, 0).getDate());
  const result = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return result > maxDate ? maxDate : result;
}
