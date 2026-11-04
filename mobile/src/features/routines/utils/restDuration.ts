export function formatRestDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function parseRestDuration(minutes: string, seconds: string): number {
  if (!/^\d+$/.test(minutes) || !/^\d+$/.test(seconds)) {
    throw new Error("Enter whole numbers for minutes and seconds.");
  }
  const total = Number(minutes) * 60 + Number(seconds);
  if (!Number.isSafeInteger(total) || Number(seconds) > 59) {
    throw new Error("Use 0–59 seconds and a valid number of minutes.");
  }
  return total;
}
