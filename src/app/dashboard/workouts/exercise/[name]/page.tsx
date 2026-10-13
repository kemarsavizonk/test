"use client";

import { ArrowLeft, Dumbbell, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { WeightDisplay } from "@/components/weight-display";
import { LiftTrend } from "@/components/lift-trend";
import { useWorkouts } from "@/hooks/use-workouts";
import { buildExerciseHistory, type ExerciseLog } from "@/lib/exercise-history";
import { bestEstimatedOneRepMax, normalizeExerciseName } from "@/lib/fitness";
import { deleteExerciseLogs } from "@/lib/workout-repository";

export default function ExerciseHistoryPage() {
  const { name } = useParams<{ name: string }>();
  let exerciseName = name;
  try { exerciseName = decodeURIComponent(name); } catch { /* Treat malformed URL escapes as an unknown exercise. */ }
  const { workouts, unit, loading, error, refresh } = useWorkouts();
  const history = buildExerciseHistory(workouts).find((item) => item.key === normalizeExerciseName(exerciseName));
  const [deleting, setDeleting] = useState("");
  const [actionError, setActionError] = useState("");
  const remove = async (log: ExerciseLog) => {
    if (!window.confirm(`Delete this ${log.exercise.name} log? Other exercises from the same session will be kept.`)) return;
    setDeleting(log.workout.id); setActionError("");
    try { await deleteExerciseLogs(log.workout.id, log.exerciseIds); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not delete this log."); }
    finally { setDeleting(""); }
  };
  return <div className="app-page"><Link href="/dashboard/workouts" className="exercise-history-back"><ArrowLeft size={17} /> Back to history</Link><PageHeader eyebrow="Exercise history" title={history?.name ?? "Exercise history"} description="Every log for this exercise, newest first. Comparisons use your top completed working weight." action={<Link href="/dashboard/workouts/new" className="btn btn-primary"><Plus size={18} /> Log workout</Link>} />
    {(error || actionError) && <div className="logger-error" role="alert">{error || actionError}</div>}
    {loading ? <p className="muted">Loading exercise logs…</p> : !history ? <Card><EmptyState icon={<Dumbbell />} title="No logs for this exercise" description="Log this exercise to start building its history." action={<Link href="/dashboard/workouts" className="btn btn-secondary">Back to history</Link>} /></Card> : <div className="exercise-log-list">{history.logs.map((log, index) => {
      const estimatedMax = bestEstimatedOneRepMax(log.exercise);
      const completedSets = log.exercise.sets.filter((set) => set.completed && set.type !== "warmup");
      return <Card key={log.workout.id} className="exercise-log">
        <div className="exercise-log-heading"><div>{index === 0 && <span className="eyebrow">Most recent log</span>}<h2><time dateTime={log.workout.performedAt}>{format(new Date(log.workout.performedAt), "MMMM d, yyyy · h:mm a")}</time></h2><p>{log.exercise.muscleGroup}{log.exercise.equipment ? ` · ${log.exercise.equipment}` : ""}{log.workout.durationMinutes ? ` · ${log.workout.durationMinutes} min session` : ""}</p></div><Badge tone={log.workout.status === "completed" ? "green" : "gray"}>{log.workout.status}</Badge></div>
        <LiftTrend log={log} unit={unit} />
        {log.previousWeight != null && <p className="exercise-log-previous">Previous top weight: <WeightDisplay value={log.previousWeight} unit={unit} compact /></p>}
        <div className="exercise-log-metrics"><div><span>Top weight</span><strong>{log.maximumWeight == null ? "—" : <WeightDisplay value={log.maximumWeight} unit={unit} />}</strong></div><div><span>Working volume</span><strong><WeightDisplay value={log.volume} unit={unit} /></strong></div><div><span>Est. 1 rep max</span><strong>{estimatedMax == null ? "—" : <WeightDisplay value={estimatedMax} unit={unit} />}</strong></div><div><span>Working sets / reps</span><strong>{completedSets.length} / {completedSets.reduce((sum, set) => sum + set.repetitions, 0)}</strong></div></div>
        <details className="exercise-log-details" open={index === 0}><summary>{log.exercise.sets.length} sets · View set details</summary><div className="exercise-set-list">{log.exercise.sets.map((set, setIndex) => <div key={`${set.id}:${setIndex}`} className="exercise-set-detail"><div className="exercise-set-heading"><strong>Set {setIndex + 1} · {set.type}</strong><span>{set.completed ? "Complete" : "Incomplete"}</span></div><div className="exercise-set-metrics"><div><span>Weight</span><strong><WeightDisplay value={set.weight} unit={unit} /></strong></div><div><span>Reps</span><strong>{set.repetitions}</strong></div><div><span>RPE</span><strong>{set.rpe ?? "—"}</strong></div></div></div>)}</div></details>
        {log.exercise.notes && <div className="exercise-log-notes"><strong>Exercise notes</strong><p>{log.exercise.notes}</p></div>}
        {log.workout.notes && <div className="exercise-log-notes"><strong>Session notes</strong><p>{log.workout.notes}</p></div>}
        <div className="exercise-log-actions"><Link className="btn btn-secondary" href={`/dashboard/workouts/${log.workout.id}/edit`}><Pencil size={17} /> Edit session</Link><Button variant="danger" disabled={deleting === log.workout.id} onClick={() => void remove(log)}><Trash2 size={17} /> {deleting === log.workout.id ? "Deleting…" : "Delete log"}</Button></div>
      </Card>;
    })}</div>}
  </div>;
}
