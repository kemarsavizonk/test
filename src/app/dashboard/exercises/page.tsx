"use client";

import { BookOpen, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { MUSCLE_GROUPS, STARTER_EXERCISES } from "@/lib/constants";
import { useWorkouts } from "@/hooks/use-workouts";

export default function ExerciseLibraryPage() {
  const { workouts } = useWorkouts(); const [query, setQuery] = useState(""); const [group, setGroup] = useState("All");
  const exercises = useMemo(() => { const seen = new Map<string,{name:string;muscleGroup:string;equipment?:string;uses:number;last?:string}>(); STARTER_EXERCISES.forEach(item => seen.set(item.name.toLowerCase(), {...item,uses:0})); workouts.forEach(workout => workout.exercises.forEach(item => { const key=item.name.toLowerCase(); const old=seen.get(key); seen.set(key,{name:item.name,muscleGroup:item.muscleGroup,equipment:item.equipment,uses:(old?.uses??0)+1,last:workout.performedAt}); })); return [...seen.values()].filter(item => (group === "All" || item.muscleGroup === group) && item.name.toLowerCase().includes(query.toLowerCase())).sort((a,b) => b.uses-a.uses || a.name.localeCompare(b.name)); }, [workouts,query,group]);
  return <div className="app-page"><PageHeader eyebrow="Exercise library" title="Movements you can build on" description="Start from familiar exercises or type a new name while logging. Your custom movements are remembered automatically." />
    <Card style={{ padding: 16, marginBottom: 18 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }} className="exercise-filter"><label style={{ position: "relative" }}><Search size={18} style={{ position: "absolute", left: 13, top: 14, color: "#94a3b8" }} /><input aria-label="Search exercises" className="input" style={{ paddingLeft: 42 }} placeholder="Search exercise names" value={query} onChange={e=>setQuery(e.target.value)} /></label><select aria-label="Filter muscle group" className="input" value={group} onChange={e=>setGroup(e.target.value)}><option>All</option>{MUSCLE_GROUPS.map(item=><option key={item}>{item}</option>)}</select></div></Card>
    <div className="grid-auto">{exercises.map(item => <Card key={item.name} style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, color: "#1642bb", background: "#eff4ff" }}><BookOpen size={19} /></span>{item.uses > 0 && <Star size={17} fill="#f59e0b" color="#f59e0b" aria-label="Used exercise" />}</div><h2 style={{ fontSize: 17, margin: "17px 0 6px" }}>{item.name}</h2><p className="muted" style={{ fontSize: 13, margin: 0 }}>{item.muscleGroup}{item.equipment ? ` · ${item.equipment}` : ""}</p><div style={{ paddingTop: 15, marginTop: 15, borderTop: "1px solid #edf0f5", fontSize: 12, color: item.uses ? "#15803d" : "#64748b" }}>{item.uses ? `Logged in ${item.uses} session${item.uses===1?"":"s"}` : "Starter exercise"}</div></Card>)}</div><style jsx>{`@media(max-width:600px){.exercise-filter{grid-template-columns:1fr!important}}`}</style>
  </div>;
}
