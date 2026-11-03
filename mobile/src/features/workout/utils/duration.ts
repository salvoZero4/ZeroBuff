/** Elapsed workout time in seconds, excluding pauses. */
export function calculateWorkoutDurationSeconds(
  startedAtTimestamp: number,
  pausedAtTimestamp: number | null,
  accumulatedPauseMs: number,
  isPaused: boolean,
): number {
  const now = isPaused && pausedAtTimestamp ? pausedAtTimestamp : Date.now();
  const totalElapsedMs = now - startedAtTimestamp - accumulatedPauseMs;
  return Math.max(0, Math.floor(totalElapsedMs / 1000));
}
