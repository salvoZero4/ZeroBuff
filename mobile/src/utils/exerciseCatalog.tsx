export type ExerciseDefinition = {
  id: string;
  name: string;
  muscleGroup: string;
  category: "barbell" | "dumbbell" | "machine" | "bodyweight" | "cable";
};

export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  {
    id: "bench-press",
    name: "Bench Press",
    muscleGroup: "Chest",
    category: "barbell",
  },
  {
    id: "incline-press",
    name: "Incline Dumbbell Press",
    muscleGroup: "Chest",
    category: "dumbbell",
  },
  {
    id: "cable-fly",
    name: "Cable Fly",
    muscleGroup: "Chest",
    category: "cable",
  },
  {
    id: "barbell-row",
    name: "Barbell Row",
    muscleGroup: "Back",
    category: "barbell",
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    muscleGroup: "Back",
    category: "cable",
  },
  {
    id: "pull-up",
    name: "Pull Up",
    muscleGroup: "Back",
    category: "bodyweight",
  },
  {
    id: "back-squat",
    name: "Back Squat",
    muscleGroup: "Quads",
    category: "barbell",
  },
  {
    id: "leg-press",
    name: "Leg Press",
    muscleGroup: "Quads",
    category: "machine",
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    muscleGroup: "Hamstrings",
    category: "barbell",
  },
  {
    id: "overhead-press",
    name: "Overhead Press",
    muscleGroup: "Shoulders",
    category: "barbell",
  },
  {
    id: "lateral-raise",
    name: "Lateral Raise",
    muscleGroup: "Shoulders",
    category: "dumbbell",
  },
  {
    id: "barbell-curl",
    name: "Barbell Curl",
    muscleGroup: "Biceps",
    category: "barbell",
  },
  {
    id: "tricep-pushdown",
    name: "Tricep Pushdown",
    muscleGroup: "Triceps",
    category: "cable",
  },
];

export const MUSCLE_GROUPS = [
  "All",
  "Chest",
  "Back",
  "Quads",
  "Hamstrings",
  "Shoulders",
  "Biceps",
  "Triceps",
] as const;
