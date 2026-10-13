"use client";

import { BookOpen, Plus, Search, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { MUSCLE_GROUPS } from "@/lib/constants";
import { normalizeExerciseName } from "@/lib/fitness";
import { useExerciseCatalog } from "@/hooks/use-exercise-catalog";
import { useWorkouts } from "@/hooks/use-workouts";

export default function ExerciseLibraryPage() {
  const { workouts } = useWorkouts();
  const { catalog, loading, error } = useExerciseCatalog();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const exercises = useMemo(() => catalog.map((item) => {
    const uses = workouts.filter((workout) => workout.exercises.some((exercise) => normalizeExerciseName(exercise.name) === normalizeExerciseName(item.name))).length;
    return { ...item, uses };
  }).filter((item) => (group === "All" || item.muscleGroup === group) && item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name)), [workouts, catalog, query, group]);
  return <div className="app-page"><PageHeader eyebrow="Exercise library" title="Your exercise catalog" description="Browse preset exercises and the custom exercises saved to your profile." action={<Link href="/dashboard/exercises/new" className="btn btn-primary"><Plus size={18} /> Add custom exercise</Link>} />
    <Card className="history-search"><div className="history-filters"><label className="history-search-input"><Search size={18} /><input aria-label="Search exercises" className="input" placeholder="Search exercise names" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="Filter muscle group" className="input" value={group} onChange={(event) => setGroup(event.target.value)}><option>All</option>{MUSCLE_GROUPS.map((item) => <option key={item}>{item}</option>)}</select></div></Card>
    {error && <div className="logger-error" role="alert">{error}</div>}
    {loading ? <p className="muted">Loading your exercise catalog…</p> : <div className="grid-auto">{exercises.map((item) => <Card key={item.name} style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><BookOpen size={22} color="#1642bb" /><Badge tone={item.isCustom ? "green" : "blue"}>{item.isCustom ? "Custom exercise" : "Preset"}</Badge></div><h2 style={{ fontSize: 17, margin: "17px 0 6px" }}>{item.name}</h2><p className="muted" style={{ fontSize: 13, margin: 0 }}>{item.muscleGroup}{item.equipment ? ` · ${item.equipment}` : ""}</p><div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 15, marginTop: 15, borderTop: "1px solid #edf0f5", fontSize: 12, color: item.uses ? "#15803d" : "#64748b" }}>{item.uses > 0 && <Star size={15} />} {item.uses ? `Logged in ${item.uses} session${item.uses === 1 ? "" : "s"}` : "Ready to log"}</div></Card>)}</div>}
  </div>;
}
