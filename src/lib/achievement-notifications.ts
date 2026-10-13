import type { PersonalBestAchievement, WeightUnit } from "@/lib/types";
import { normalizeExerciseName, toCanonicalKg } from "@/lib/fitness";

// Session/exercise row IDs can change when a workout is edited. Key a record by
// its session, exercise name and canonical weight so edits and unit changes
// do not turn an already-read record into a new notification.
export function achievementNotificationKey(achievement: PersonalBestAchievement, unit: WeightUnit) {
  return `${achievement.id.split(":")[0]}:${normalizeExerciseName(achievement.exerciseName)}:${toCanonicalKg(achievement.currentWeight, unit).toFixed(3)}`;
}

export function unreadAchievementKeys(achievements: PersonalBestAchievement[], unit: WeightUnit, seen: string[]) {
  const read = new Set(seen);
  return achievements.map((achievement) => achievementNotificationKey(achievement, unit)).filter((key) => !read.has(key));
}
