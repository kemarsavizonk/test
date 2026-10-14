"use client";

import { format } from "date-fns";
import { Award, Sparkles, TrendingUp } from "lucide-react";
import { WeightDisplay } from "@/components/weight-display";
import { useAchievements } from "@/components/achievement-provider";
import { achievementNotificationKey } from "@/lib/achievement-notifications";
import { formatNumber } from "@/lib/utils";
import { usePreferredName } from "@/hooks/use-preferred-name";

export default function AchievementsPage() {
  const name = usePreferredName();
  const { achievements, unit, loading, error, visitNewKeys } = useAchievements();
  const newCount = visitNewKeys.filter((key) => achievements.some((item) => achievementNotificationKey(item, unit) === key)).length;

  return <div className="achievements-page">
    <section className="achievement-hero">
      <div className="achievement-glow" />
      <div className="achievement-badge" aria-label={`${achievements.length} achievements`}>
        <div className="achievement-badge-inner"><Sparkles size={25} fill="currentColor" /><strong>{loading ? "—" : achievements.length}</strong><span>ACHIEVEMENTS</span></div>
      </div>
      <div className="achievement-heading"><div className="eyebrow">{name ? `${name}’s achievements` : "Your achievements"}</div><h1>{loading ? "Finding your achievements…" : newCount ? `${newCount} new achievement${newCount === 1 ? "" : "s"}!` : achievements.length ? "Your training achievements" : "Your next achievement starts here"}</h1><p>{newCount ? "Congratulations! Your hard work paid off." : achievements.length ? "Heavier lifts, more reps, and more sets—your progress in one place." : "Repeat an exercise with a heavier lift, more completed reps, or more completed sets to unlock an achievement."}</p></div>
    </section>

    {error && <div className="achievement-error" role="alert">{error}</div>}
    {!loading && achievements.length > 0 && <section className="achievement-list" aria-label="Achievement history">{achievements.map((achievement) => <article className="achievement-row" key={achievement.id} data-kind={achievement.kind}>
      <div className="achievement-title"><div>{visitNewKeys.includes(achievementNotificationKey(achievement, unit)) && <span className="achievement-new">New</span>}<h2>{achievement.exerciseName}</h2><time dateTime={achievement.achievedAt}>{format(new Date(achievement.achievedAt), "MMM d, yyyy")}</time></div><span className="achievement-check"><Award size={19} /></span></div>
      {achievement.kind === "weight" ? <><div className="achievement-metric"><span>Weight personal best</span><strong><WeightDisplay value={achievement.currentWeight} unit={unit} /></strong><span className="achievement-gain"><TrendingUp size={16} /><WeightDisplay value={achievement.improvement} unit={unit} signed compact /></span></div>{achievement.volumeImprovementPercentage != null && achievement.volumeImprovementPercentage > 0 && <div className="achievement-metric volume"><span>Max volume (all sets)</span><strong className="achievement-gain"><TrendingUp size={16} />{formatNumber(achievement.volumeImprovementPercentage, 1)}%</strong></div>}</> : <><div className="achievement-metric"><span>{achievement.kind === "reps" ? "More reps" : "More sets"}</span><strong>{achievement.currentCount} <small>{achievement.kind}</small></strong><span className="achievement-gain"><TrendingUp size={16} />+{achievement.improvement}</span></div><p className="achievement-previous">Previously {achievement.previousCount} {achievement.previousCount === 1 ? achievement.kind === "sets" ? "set" : "rep" : achievement.kind} in your last completed log. {achievement.kind === "reps" ? "Total completed reps across working sets." : "Completed working sets."} Warm-ups excluded.</p></>}
    </article>)}</section>}
    {!loading && achievements.length === 0 && <section className="achievement-empty"><Award size={31} /><h2>No achievements yet</h2><p>Your first completed entry sets the baseline. Increase your weight, total reps, or completed sets in a later workout to see your progress here.</p></section>}
  </div>;
}
