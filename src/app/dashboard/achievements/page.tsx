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
      <div className="achievement-badge" aria-label={`${achievements.length} personal bests`}>
        <div className="achievement-badge-inner"><Sparkles size={25} fill="currentColor" /><strong>{loading ? "—" : achievements.length}</strong><span>PERSONAL<br />BESTS</span></div>
      </div>
      <div className="achievement-heading"><div className="eyebrow">{name ? `${name}’s achievements` : "Your achievements"}</div><h1>{loading ? "Finding your personal bests…" : newCount ? `${newCount} new personal best${newCount === 1 ? "" : "s"}!` : achievements.length ? "Your personal bests" : "Your next personal best starts here"}</h1><p>{newCount ? "Congratulations! Your hard work paid off." : achievements.length ? "Your progress, one stronger session at a time." : "Complete the same exercise again with a heavier top set to unlock your first achievement."}</p></div>
    </section>

    {error && <div className="achievement-error" role="alert">{error}</div>}
    {!loading && achievements.length > 0 && <section className="achievement-list" aria-label="Personal best history">{achievements.map((achievement) => <article className="achievement-row" key={achievement.id}>
      <div className="achievement-title"><div>{visitNewKeys.includes(achievementNotificationKey(achievement, unit)) && <span className="achievement-new">New</span>}<h2>{achievement.exerciseName}</h2><time dateTime={achievement.achievedAt}>{format(new Date(achievement.achievedAt), "MMM d, yyyy")}</time></div><span className="achievement-check"><Award size={19} /></span></div>
      <div className="achievement-metric"><span>{achievement.repetitions ? `${achievement.repetitions} rep ` : ""}max</span><strong><WeightDisplay value={achievement.currentWeight} unit={unit} /></strong><span className="achievement-gain"><TrendingUp size={16} /><WeightDisplay value={achievement.improvement} unit={unit} signed compact /></span></div>
      {achievement.volumeImprovementPercentage != null && achievement.volumeImprovementPercentage > 0 && <div className="achievement-metric volume"><span>Max volume (all sets)</span><strong className="achievement-gain"><TrendingUp size={16} />{formatNumber(achievement.volumeImprovementPercentage, 1)}%</strong></div>}
    </article>)}</section>}
    {!loading && achievements.length === 0 && <section className="achievement-empty"><Award size={31} /><h2>No personal bests yet</h2><p>Your first completed entry sets the baseline. Beat that top weight in a later workout and it will appear here.</p></section>}
  </div>;
}
