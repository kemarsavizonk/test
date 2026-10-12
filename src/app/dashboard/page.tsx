"use client";

import { ArrowRight, CalendarDays, Dumbbell, Layers3, Plus, Scale, Sparkles } from "lucide-react";
import Link from "next/link";
import { format, isAfter, subDays } from "date-fns";
import { Card, EmptyState, PageHeader, Badge } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { aggregatePeriod, workoutVolume } from "@/lib/fitness";
import { formatNumber } from "@/lib/utils";
import { useWorkouts } from "@/hooks/use-workouts";

export default function DashboardPage() {
  const { workouts, loading, error } = useWorkouts();
  const recentPeriod = workouts.filter((workout) => isAfter(new Date(workout.performedAt), subDays(new Date(), 7)));
  const metrics = aggregatePeriod(recentPeriod);
  return <div className="app-page"><PageHeader eyebrow="Overview" title="Your training dashboard" description="A clear view of your recent work, consistency, and progress." action={<Link href="/dashboard/workouts/new" className="btn btn-primary"><Plus size={18} /> Log workout</Link>} />
    {error && <div role="alert" style={{ padding: 14, borderRadius: 11, background: "#fef2f2", color: "#b91c1c", marginBottom: 20 }}>{error}</div>}
    <div className="grid-auto" style={{ marginBottom: 22 }}><StatCard label="Workouts this week" value={String(metrics.workouts)} detail="Completed sessions" icon={Dumbbell} /><StatCard label="Working sets" value={formatNumber(metrics.sets)} detail="Warm-ups excluded" icon={Layers3} /><StatCard label="Training volume" value={`${formatNumber(Math.round(metrics.volume))} lb`} detail="Weight × repetitions" icon={Scale} /><StatCard label="Days trained" value={String(metrics.daysTrained)} detail="Past seven days" icon={CalendarDays} /></div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(260px,.8fr)", gap: 20 }} className="dashboard-split">
      <Card><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "21px 22px", borderBottom: "1px solid #e2e8f0" }}><div><h2 style={{ fontSize: 18, margin: 0 }}>Recent workouts</h2><p className="muted" style={{ fontSize: 13, margin: "5px 0 0" }}>Your latest recorded sessions</p></div>{workouts.length > 0 && <Link href="/dashboard/workouts" style={{ color: "#1642bb", fontWeight: 800, fontSize: 13 }}>View all</Link>}</div>
        {loading ? <div style={{ padding: 35 }} className="muted">Loading your training history…</div> : workouts.length === 0 ? <EmptyState icon={<Dumbbell />} title="Your training story starts here" description="Log your first session. Your dashboard will turn real workout data into useful progress signals." action={<Link href="/dashboard/workouts/new" className="btn btn-primary">Log first workout</Link>} /> : <div>{workouts.slice(0,5).map(workout => <Link href="/dashboard/workouts" key={workout.id} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 14, alignItems: "center", padding: "17px 22px", borderBottom: "1px solid #edf0f5" }}><span style={{ width: 42, height: 42, display: "grid", placeItems: "center", background: "#eff4ff", color: "#1642bb", borderRadius: 12 }}><Dumbbell size={19} /></span><span><strong style={{ display: "block", marginBottom: 4 }}>{workout.title}</strong><span className="muted" style={{ fontSize: 12 }}>{format(new Date(workout.performedAt), "MMM d, yyyy · h:mm a")} · {workout.exercises.length} exercise{workout.exercises.length === 1 ? "" : "s"} · {formatNumber(workoutVolume(workout))} lb</span></span><Badge tone={workout.status === "completed" ? "green" : "gray"}>{workout.status}</Badge></Link>)}</div>}
      </Card>
      <div style={{ display: "grid", alignContent: "start", gap: 20 }}><Card style={{ padding: 22, background: "linear-gradient(145deg,#1642bb,#11358f)", color: "white", border: 0 }}><Sparkles size={24} color="#a9bff7" /><h2 style={{ fontSize: 20, margin: "18px 0 9px" }}>Build consistency</h2><p style={{ color: "#d5def7", lineHeight: 1.6, margin: "0 0 20px", fontSize: 14 }}>{metrics.workouts ? `You have completed ${metrics.workouts} session${metrics.workouts === 1 ? "" : "s"} in the last seven days. Keep giving your progress clean data.` : "A single well-recorded workout is enough to establish your baseline."}</p><Link href="/dashboard/workouts/new" className="btn" style={{ background: "white", color: "#1642bb", width: "100%" }}>Start a session <ArrowRight size={17} /></Link></Card><Card style={{ padding: 22 }}><h2 style={{ fontSize: 18, margin: 0 }}>Quick links</h2><div style={{ display: "grid", marginTop: 12 }}>{[["Review reports","/dashboard/reports"],["Browse exercises","/dashboard/exercises"],["View personal records","/dashboard/records"]].map(([label,href]) => <Link key={href} href={href} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #edf0f5", color: "#475569", fontWeight: 700, fontSize: 14 }}>{label}<ArrowRight size={16} /></Link>)}</div></Card></div>
    </div><style jsx>{`@media(max-width:980px){.dashboard-split{grid-template-columns:1fr!important}}`}</style>
  </div>;
}
