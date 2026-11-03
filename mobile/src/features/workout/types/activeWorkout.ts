export type ActiveSetLog = {
  backendId?: string;
  saveStatus?: "pending" | "saved" | "error" | "dirty";
  saveError?: string;
  retryAction?: "save" | "delete" | "remove";
  needsReconcile?: boolean;
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
  completed: boolean;
  // Set to true as soon as the user edits the set: prefills must never
  // overwrite a value the user cleared or changed.
  touched?: boolean;
};

export type ActiveWorkoutSession = {
  isFinishing?: boolean;
  autoRestEnabled?: boolean;
  restEndTimestamp?: number | null;
  restTimerId?: string;
  sessionId: string | null;
  routineId: string;
  routineName: string;
  currentExerciseIndex: number;
  startedAtTimestamp: number;
  pausedAtTimestamp: number | null;
  accumulatedPauseMs: number;
  isPaused: boolean;
  workoutLogs: Record<string, ActiveSetLog[]>;
};
