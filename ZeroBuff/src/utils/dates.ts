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
