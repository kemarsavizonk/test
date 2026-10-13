"use client";

import { Check, Copy, Dumbbell, GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Button, Card, Field, PageHeader } from "@/components/ui";
import { WeightDisplay } from "@/components/weight-display";
import { STARTER_EXERCISES } from "@/lib/constants";
import { convertWeight, createId, exerciseVolume } from "@/lib/fitness";
import { getPreferredWeightUnit, saveWorkout, updateWorkout } from "@/lib/workout-repository";
import type { SetType, WeightUnit, WorkoutExercise, WorkoutSession } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const newSet = (number: number) => ({ id: createId(), setNumber: number, weight: 0, repetitions: 0, completed: true, type: "working" as SetType });
const newExercise = (): WorkoutExercise => ({ id: createId(), name: "", muscleGroup: "Chest", sets: [newSet(1)] });
const approvedByName = new Map(STARTER_EXERCISES.map((exercise) => [exercise.name.toLocaleLowerCase(), exercise]));

export function WorkoutBuilder({ initialWorkout, initialUnit }: { initialWorkout?: WorkoutSession; initialUnit?: WeightUnit }) {
  const router = useRouter();
  const [performedAt, setPerformedAt] = useState(format(initialWorkout ? new Date(initialWorkout.performedAt) : new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState(initialWorkout?.notes ?? "");
  const [duration, setDuration] = useState(initialWorkout?.durationMinutes ? String(initialWorkout.durationMinutes) : "");
  const [unit, setUnit] = useState<WeightUnit>(initialUnit ?? "lb");
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialWorkout?.exercises ?? [newExercise()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!initialUnit) void getPreferredWeightUnit().then(setUnit); }, [initialUnit]);
  const totalSets = useMemo(() => exercises.reduce((sum, item) => sum + item.sets.length, 0), [exercises]);
  const totalVolume = useMemo(() => exercises.reduce((sum, item) => sum + exerciseVolume(item), 0), [exercises]);
  const secondaryUnit: WeightUnit = unit === "lb" ? "kg" : "lb";
  const updateExercise = (id: string, patch: Partial<WorkoutExercise>) => setExercises((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const updateSet = (exerciseId: string, setId: string, key: string, value: string | boolean) => setExercises((items) => items.map((item) => item.id !== exerciseId ? item : { ...item, sets: item.sets.map((set) => set.id !== setId ? set : { ...set, [key]: typeof value === "string" && ["weight", "repetitions", "rpe"].includes(key) ? Number(value) : value }) }));
  const addSet = (id: string) => setExercises((items) => items.map((item) => item.id !== id ? item : { ...item, sets: [...item.sets, { ...newSet(item.sets.length + 1), weight: item.sets.at(-1)?.weight ?? 0, repetitions: item.sets.at(-1)?.repetitions ?? 0 }] }));
  const removeSet = (exerciseId: string, setId: string) => setExercises((items) => items.map((item) => item.id !== exerciseId ? item : { ...item, sets: item.sets.filter((set) => set.id !== setId).map((set, index) => ({ ...set, setNumber: index + 1 })) }));
  const chooseKnownExercise = (id: string, value: string) => {
    const found = approvedByName.get(value.trim().toLocaleLowerCase());
    updateExercise(id, found ? { name: found.name, muscleGroup: found.muscleGroup, equipment: found.equipment } : { name: value });
  };
  const changeUnit = (nextUnit: WeightUnit) => {
    if (nextUnit === unit) return;
    setExercises((items) => items.map((item) => ({ ...item, sets: item.sets.map((set) => ({ ...set, weight: convertWeight(set.weight, unit, nextUnit) })) })));
    setUnit(nextUnit);
  };
  const discard = () => {
    const hasEntry = Boolean(initialWorkout || notes || duration || exercises.some((exercise) => exercise.name || exercise.sets.some((set) => set.weight || set.repetitions)));
    if (!hasEntry || window.confirm("Discard this workout without saving it?")) router.push("/dashboard");
  };
  const submit = async (status: "draft" | "completed") => {
    setError("");
    const valid = exercises.filter((item) => item.name.trim() && item.sets.length);
    if (!valid.length) { setError("Select at least one exercise and add a set before saving."); return; }
    const invalid = valid.find((item) => !approvedByName.has(item.name.trim().toLocaleLowerCase()));
    if (invalid) { setError(`“${invalid.name}” is not in the approved exercise list. Choose a suggestion before saving.`); return; }
    setSaving(true);
    const now = new Date().toISOString();
    const canonicalExercises = valid.map((item) => ({ ...item, ...approvedByName.get(item.name.trim().toLocaleLowerCase())! }));
    const names = canonicalExercises.map((item) => item.name);
    const workout: WorkoutSession = {
      id: initialWorkout?.id ?? createId(),
      title: names.length > 2 ? `${names.slice(0, 2).join(" + ")} + ${names.length - 2} more` : names.join(" + "),
      performedAt: new Date(performedAt).toISOString(),
      completedAt: status === "completed" ? (initialWorkout?.completedAt ?? now) : undefined,
      status,
      notes: notes.trim() || undefined,
      durationMinutes: duration ? Number(duration) : undefined,
      exercises: canonicalExercises,
      createdAt: initialWorkout?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      if (initialWorkout) await updateWorkout(workout, unit); else await saveWorkout(workout, unit);
      router.push("/dashboard/workouts");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this workout.");
      setSaving(false);
    }
  };

  return <div className="app-page"><PageHeader eyebrow={initialWorkout ? "Edit workout" : "Workout logger"} title={initialWorkout ? "Correct your session" : "Record your session"} description="Choose approved exercises and capture each set accurately." action={<div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><Button variant="ghost" disabled={saving} onClick={discard}><X size={17} /> Discard & close</Button><Button variant="secondary" disabled={saving} onClick={() => void submit("draft")}><Save size={17} /> Save draft</Button><Button disabled={saving} onClick={() => void submit("completed")}><Check size={17} /> {initialWorkout ? "Save changes" : "Finish workout"}</Button></div>} />
    {error && <div role="alert" style={{ padding: 14, borderRadius: 11, background: "#fef2f2", color: "#b91c1c", marginBottom: 20 }}>{error}</div>}
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 22 }} className="builder-grid"><div style={{ display: "grid", gap: 18 }}>
      <Card style={{ padding: 22 }}><div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 16 }} className="form-grid"><Field label="Date and time"><input className="input" type="datetime-local" value={performedAt} onChange={(event) => setPerformedAt(event.target.value)} /></Field><Field label="Duration (minutes)"><input className="input" type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="Optional" /></Field><Field label="Weight entry unit"><select className="input" value={unit} onChange={(event) => changeUnit(event.target.value as WeightUnit)}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></Field></div></Card>
      {exercises.map((exercise, exerciseIndex) => {
        const selected = approvedByName.get(exercise.name.trim().toLocaleLowerCase());
        return <Card key={exercise.id} style={{ overflow: "hidden" }}><div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #e2e8f0", background: "#fbfcfe" }}><GripVertical size={18} color="#94a3b8" /><strong>Exercise {exerciseIndex + 1}</strong><button aria-label="Remove exercise" className="btn btn-ghost" style={{ marginLeft: "auto", minHeight: 36, padding: 8 }} onClick={() => setExercises((items) => items.filter((item) => item.id !== exercise.id))}><Trash2 size={17} /></button></div><div style={{ padding: 20 }}><div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 20 }} className="exercise-fields"><Field label="Exercise" hint={exercise.name && !selected ? "Select an exact exercise from the suggestions." : "Start typing, then choose an approved exercise."}><input className="input" list="approved-exercises" value={exercise.name} onChange={(event) => chooseKnownExercise(exercise.id, event.target.value)} placeholder="Start typing an exercise…" aria-invalid={Boolean(exercise.name && !selected)} /></Field><Field label="Muscle group"><input className="input" value={selected?.muscleGroup ?? exercise.muscleGroup} readOnly /></Field><Field label="Equipment"><input className="input" value={selected?.equipment ?? exercise.equipment ?? ""} readOnly /></Field></div>
          <datalist id="approved-exercises">{STARTER_EXERCISES.map((item) => <option key={item.name} value={item.name}>{item.muscleGroup}</option>)}</datalist>
          <div style={{ overflowX: "auto" }}><div style={{ minWidth: 650 }}><div style={{ display: "grid", gridTemplateColumns: "42px 1fr 1fr 1.2fr .8fr 42px", gap: 9, padding: "0 4px 8px", color: "#64748b", fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" }}><span>Set</span><span>Weight ({unit})</span><span>Reps</span><span>Type</span><span>RPE</span><span /></div>{exercise.sets.map((set) => <div key={set.id} style={{ display: "grid", gridTemplateColumns: "42px 1fr 1fr 1.2fr .8fr 42px", gap: 9, alignItems: "start", marginBottom: 9 }}><button aria-label={`Mark set ${set.setNumber} complete`} onClick={() => updateSet(exercise.id, set.id, "completed", !set.completed)} style={{ width: 32, height: 32, marginTop: 6, borderRadius: 9, border: `1px solid ${set.completed ? "#1642bb" : "#cbd5e1"}`, background: set.completed ? "#1642bb" : "white", color: set.completed ? "white" : "#64748b", fontWeight: 800 }}>{set.completed ? <Check size={16} style={{ margin: "auto" }} /> : set.setNumber}</button><div><input aria-label={`Set ${set.setNumber} weight`} className="input" type="number" min="0" step="0.5" value={set.weight || ""} onChange={(event) => updateSet(exercise.id, set.id, "weight", event.target.value)} /><small className="muted" style={{ display: "block", marginTop: 4, fontSize: 11 }}>{formatNumber(convertWeight(set.weight, unit, secondaryUnit), 1)} {secondaryUnit}</small></div><input aria-label={`Set ${set.setNumber} repetitions`} className="input" type="number" min="0" value={set.repetitions || ""} onChange={(event) => updateSet(exercise.id, set.id, "repetitions", event.target.value)} /><select aria-label={`Set ${set.setNumber} type`} className="input" value={set.type} onChange={(event) => updateSet(exercise.id, set.id, "type", event.target.value)}>{["warmup", "working", "drop", "failure"].map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select><input aria-label={`Set ${set.setNumber} RPE`} className="input" type="number" min="1" max="10" step="0.5" value={set.rpe ?? ""} onChange={(event) => updateSet(exercise.id, set.id, "rpe", event.target.value)} /><button aria-label={`Delete set ${set.setNumber}`} className="btn btn-ghost" style={{ padding: 6, minHeight: 35, marginTop: 5 }} onClick={() => removeSet(exercise.id, set.id)} disabled={exercise.sets.length === 1}><X size={17} /></button></div>)}</div></div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 13 }}><Button variant="secondary" onClick={() => addSet(exercise.id)}><Plus size={16} /> Add set</Button><Button variant="ghost" onClick={() => { const last = exercise.sets.at(-1); if (last) setExercises((items) => items.map((item) => item.id !== exercise.id ? item : { ...item, sets: [...item.sets, { ...last, id: createId(), setNumber: item.sets.length + 1 }] })); }}><Copy size={16} /> Duplicate last</Button></div><textarea className="input" style={{ minHeight: 72, resize: "vertical", marginTop: 16 }} value={exercise.notes ?? ""} onChange={(event) => updateExercise(exercise.id, { notes: event.target.value })} placeholder="Exercise notes (optional)" /></div></Card>;
      })}
      <Button variant="secondary" style={{ borderStyle: "dashed", minHeight: 56 }} onClick={() => setExercises((items) => [...items, newExercise()])}><Plus size={18} /> Add another exercise</Button><Field label="Session notes"><textarea className="input" style={{ minHeight: 100, resize: "vertical" }} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How did the session feel?" /></Field>
    </div><aside><Card style={{ padding: 21, position: "sticky", top: 24 }}><div className="eyebrow">Live summary</div><h2 style={{ margin: "9px 0 20px", fontSize: 20 }}>Session totals</h2><div style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid #edf0f5" }}><span className="muted">Exercises</span><strong>{exercises.filter((item) => item.name).length}</strong></div><div style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid #edf0f5" }}><span className="muted">Total sets</span><strong>{totalSets}</strong></div><div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: "1px solid #edf0f5" }}><span className="muted">Working volume</span><strong style={{ textAlign: "right" }}><WeightDisplay value={totalVolume} unit={unit} /></strong></div><p className="muted" style={{ fontSize: 12, lineHeight: 1.6, margin: "18px 0" }}>Completed working, drop, and failure sets count toward volume. Both units are shown while kilograms remain the canonical stored value.</p><Button style={{ width: "100%" }} disabled={saving} onClick={() => void submit("completed")}><Dumbbell size={17} /> {saving ? "Saving…" : initialWorkout ? "Save changes" : "Finish workout"}</Button></Card></aside></div>
    <style jsx>{`@media(max-width:1000px){.builder-grid{grid-template-columns:1fr!important}.builder-grid aside{display:none}}@media(max-width:700px){.form-grid,.exercise-fields{grid-template-columns:1fr!important}}`}</style>
  </div>;
}
