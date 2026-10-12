export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core / Abs",
  "Full Body",
  "Cardio",
  "Other",
] as const;

export const STARTER_EXERCISES = [
  { name: "Bench Press", muscleGroup: "Chest", equipment: "Barbell" },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest", equipment: "Dumbbell" },
  { name: "Squat", muscleGroup: "Quadriceps", equipment: "Barbell" },
  { name: "Deadlift", muscleGroup: "Back", equipment: "Barbell" },
  { name: "Lat Pulldown", muscleGroup: "Back", equipment: "Cable" },
  { name: "Seated Cable Row", muscleGroup: "Back", equipment: "Cable" },
  { name: "Shoulder Press", muscleGroup: "Shoulders", equipment: "Dumbbell" },
  { name: "Bicep Curl", muscleGroup: "Biceps", equipment: "Dumbbell" },
  { name: "Tricep Pushdown", muscleGroup: "Triceps", equipment: "Cable" },
  { name: "Leg Press", muscleGroup: "Legs", equipment: "Machine" },
  { name: "Leg Extension", muscleGroup: "Quadriceps", equipment: "Machine" },
  { name: "Lateral Raise", muscleGroup: "Shoulders", equipment: "Dumbbell" },
] as const;

export const DEFAULT_TIMEZONE = "America/Jamaica";
export const KG_TO_LB = 2.20462262185;
