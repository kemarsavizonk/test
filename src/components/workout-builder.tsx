"use client";

import { Check, Copy, Dumbbell, GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Button, Card, Field, PageHeader } from "@/components/ui";
import { WeightDisplay } from "@/components/weight-display";
import { useExerciseCatalog } from "@/hooks/use-exercise-catalog";
import { MUSCLE_GROUPS } from "@/lib/constants";
import { convertWeight, createId, exerciseVolume, normalizeExerciseName } from "@/lib/fitness";
import { getPreferredWeightUnit, saveWorkout, updateWorkout } from "@/lib/workout-repository";
import type { SetType, WeightUnit, WorkoutExercise, WorkoutSession } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const newSet = (number: number) => ({ id: createId(), setNumber: number, weight: 0, repetitions: 0, completed: true, type: "working" as SetType });
const newExercise = (): WorkoutExercise => ({ id: createId(), name: "", muscleGroup: "Chest", sets: [newSet(1)] });

export function WorkoutBuilder({ initialWorkout, initialUnit }: { initialWorkout?: WorkoutSession; initialUnit?: WeightUnit }) {
  const router = useRouter();
  const { catalog, loading: catalogLoading, error: catalogError } = useExerciseCatalog();
  const approvedByName = new Map(catalog.map((item) => [normalizeExerciseName(item.name), item]));
  const [performedAt, setPerformedAt] = useState(format(initialWorkout ? new Date(initialWorkout.performedAt) : new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState(initialWorkout?.notes ?? "");
  const [duration, setDuration] = useState(initialWorkout?.durationMinutes ? String(initialWorkout.durationMinutes) : "");
  const [unit, setUnit] = useState<WeightUnit>(initialUnit ?? "lb");
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialWorkout?.exercises ?? [newExercise()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);

  useEffect(() => { if (!initialUnit) void getPreferredWeightUnit().then(setUnit); }, [initialUnit]);
  const totalSets = useMemo(() => exercises.reduce((sum, item) => sum + item.sets.length, 0), [exercises]);
  const totalVolume = useMemo(() => exercises.reduce((sum, item) => sum + exerciseVolume(item), 0), [exercises]);
  const secondaryUnit: WeightUnit = unit === "lb" ? "kg" : "lb";
  const updateExercise = (id: string, patch: Partial<WorkoutExercise>) => setExercises((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const updateSet = (exerciseId: string, setId: string, key: string, value: string | boolean) => setExercises((items) => items.map((item) => item.id !== exerciseId ? item : { ...item, sets: item.sets.map((set) => set.id !== setId ? set : { ...set, [key]: typeof value === "string" && ["weight", "repetitions", "rpe"].includes(key) ? Number(value) : value }) }));
  const addSet = (id: string) => setExercises((items) => items.map((item) => item.id !== id ? item : { ...item, sets: [...item.sets, { ...newSet(item.sets.length + 1), weight: item.sets.at(-1)?.weight ?? 0, repetitions: item.sets.at(-1)?.repetitions ?? 0 }] }));
  const removeSet = (exerciseId: string, setId: string) => setExercises((items) => items.map((item) => item.id !== exerciseId ? item : { ...item, sets: item.sets.filter((set) => set.id !== setId).map((set, index) => ({ ...set, setNumber: index + 1 })) }));
  const chooseKnownExercise = (id: string, value: string) => {
    const found = approvedByName.get(normalizeExerciseName(value));
    updateExercise(id, found ? { name: found.name, muscleGroup: found.muscleGroup, equipment: found.equipment, exerciseId: found.id } : { name: value });
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
    const invalid = valid.find((item) => !approvedByName.has(normalizeExerciseName(item.name)));
    if (invalid) { setError(`“${invalid.name}” is not in your exercise catalog. Choose a suggestion or add it to your profile first.`); return; }
    setSaving(true);
    const now = new Date().toISOString();
    const canonicalExercises = valid.map((item) => ({ ...item, name: approvedByName.get(normalizeExerciseName(item.name))!.name }));
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
      if (!initialWorkout) {
        setPerformedAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setNotes("");
        setDuration("");
        setExercises([newExercise()]);
      }
      setSaving(false);
      router.push("/dashboard/workouts");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this workout.");
      setSaving(false);
    }
  };

  const actions = <div className="logger-actions">
    <Button variant="secondary" className="logger-discard" disabled={saving} onClick={discard}><X size={17} /> Discard</Button>
    <Button variant="secondary" disabled={saving || catalogLoading} onClick={() => void submit("draft")}><Save size={17} /> Save draft</Button>
    <Button disabled={saving || catalogLoading} onClick={() => void submit("completed")}><Check size={17} /> {saving ? "Saving…" : initialWorkout ? "Save changes" : "Finish"}</Button>
  </div>;

  return <div className="app-page workout-builder">
    <PageHeader eyebrow={initialWorkout ? "Edit workout" : "Workout logger"} title={initialWorkout ? "Correct your session" : "Record your session"} description="Choose an exercise, enter your weight and reps, then add more sets." action={actions} />
    {error && <div className="logger-error" role="alert">{error}</div>}
    <div className="logger-catalog-note"><p>Search preset exercises and the exercises you have added to your profile.</p><Link href="/dashboard/exercises/new" className="btn btn-secondary"><Plus size={17} /> Add custom exercise</Link></div>
    {catalogError && <div className="logger-error" role="alert">{catalogError}</div>}
    <div className="builder-grid">
      <div className="builder-content">
        <Card className="logger-details"><div className="logger-form-grid">
          <Field label="Date and time"><input className="input" type="datetime-local" value={performedAt} onChange={(event) => setPerformedAt(event.target.value)} /></Field>
          <Field label="Duration (minutes)"><input className="input" type="number" min="1" inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="Optional" /></Field>
          <Field label="Weight entry unit"><select className="input" value={unit} onChange={(event) => changeUnit(event.target.value as WeightUnit)}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></Field>
        </div></Card>
        {exercises.map((exercise, exerciseIndex) => {
          const selected = approvedByName.get(normalizeExerciseName(exercise.name));
          const query = normalizeExerciseName(exercise.name);
          const matches = query ? catalog.filter((item) => item.name.toLocaleLowerCase().includes(query))
            .sort((a, b) => Number(b.name.toLocaleLowerCase().startsWith(query)) - Number(a.name.toLocaleLowerCase().startsWith(query)) || a.name.localeCompare(b.name)) : [];
          const showSuggestions = activeExerciseId === exercise.id && Boolean(query) && !selected;
          const optionListId = `exercise-options-${exerciseIndex}`;
          return <Card key={exercise.id} className="logger-exercise">
            <div className="logger-exercise-header"><GripVertical size={18} color="#94a3b8" /><strong>Exercise {exerciseIndex + 1}</strong><Button variant="ghost" aria-label="Remove exercise" onClick={() => setExercises((items) => items.filter((item) => item.id !== exercise.id))}><Trash2 size={18} /></Button></div>
            <div className="logger-exercise-body">
              <div className="logger-exercise-fields">
                <Field label="Exercise" hint={exercise.name && !selected ? "Choose an exercise from the suggestions." : "Search your exercise list."}>
                  <div className="exercise-combobox" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setActiveExerciseId(null); }}>
                    <input className="input" role="combobox" value={exercise.name} onFocus={() => setActiveExerciseId(exercise.id)}
                      onChange={(event) => { setActiveExerciseId(exercise.id); chooseKnownExercise(exercise.id, event.target.value); }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setActiveExerciseId(null);
                        if (event.key === "ArrowDown" && showSuggestions) { event.preventDefault(); event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(".exercise-option")?.focus(); }
                      }}
                      placeholder="Search exercises…" autoComplete="off" aria-autocomplete="list" aria-controls={optionListId} aria-expanded={showSuggestions} aria-invalid={Boolean(exercise.name && !selected)} />
                    {showSuggestions && <div id={optionListId} className="exercise-suggestions" role="listbox">
                      {matches.length ? matches.map((item) => <button key={item.name} type="button" role="option" aria-selected="false" className="exercise-option"
                        onMouseDown={(event) => event.preventDefault()} onClick={() => { chooseKnownExercise(exercise.id, item.name); setActiveExerciseId(null); }}>
                        <strong>{item.name}</strong><span>{item.muscleGroup} · {item.equipment}</span>
                      </button>) : <div className="exercise-empty">No matching exercise. Use Add custom exercise to save it to your profile.</div>}
                    </div>}
                  </div>
                </Field>
                <Field label="Muscle group" hint="Change if needed"><select className="input" value={exercise.muscleGroup} onChange={(event) => updateExercise(exercise.id, { muscleGroup: event.target.value })}>{MUSCLE_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select></Field>
                <Field label="Equipment" hint="Change if needed"><input className="input" value={exercise.equipment ?? ""} onChange={(event) => updateExercise(exercise.id, { equipment: event.target.value })} placeholder="Enter equipment" /></Field>
              </div>
              <div className="logger-sets">
                {exercise.sets.map((set) => <div key={set.id} className="logger-set">
                  <div className="logger-set-heading"><strong>Set {set.setNumber}</strong>
                    <button className={set.completed ? "set-complete checked" : "set-complete"} aria-label={`Mark set ${set.setNumber} complete`} aria-pressed={set.completed} onClick={() => updateSet(exercise.id, set.id, "completed", !set.completed)}><Check size={16} />{set.completed ? "Complete" : "Incomplete"}</button>
                    <Button variant="ghost" className="set-delete" aria-label={`Delete set ${set.setNumber}`} onClick={() => removeSet(exercise.id, set.id)} disabled={exercise.sets.length === 1}><Trash2 size={17} /></Button>
                  </div>
                  <div className="logger-set-fields">
                    <Field label={`Weight (${unit})`}><input aria-label={`Set ${set.setNumber} weight`} className="input" type="number" min="0" step="0.5" inputMode="decimal" value={set.weight || ""} placeholder="0" onChange={(event) => updateSet(exercise.id, set.id, "weight", event.target.value)} /><small className="muted">{formatNumber(convertWeight(set.weight, unit, secondaryUnit), 1)} {secondaryUnit}</small></Field>
                    <Field label="Reps"><input aria-label={`Set ${set.setNumber} repetitions`} className="input" type="number" min="0" inputMode="numeric" value={set.repetitions || ""} placeholder="0" onChange={(event) => updateSet(exercise.id, set.id, "repetitions", event.target.value)} /></Field>
                    <Field label="Set type"><select aria-label={`Set ${set.setNumber} type`} className="input" value={set.type} onChange={(event) => updateSet(exercise.id, set.id, "type", event.target.value)}>{["warmup", "working", "drop", "failure"].map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></Field>
                    <Field label="RPE (optional)"><input aria-label={`Set ${set.setNumber} RPE`} className="input" type="number" min="1" max="10" step="0.5" inputMode="decimal" value={set.rpe ?? ""} placeholder="1–10" onChange={(event) => updateSet(exercise.id, set.id, "rpe", event.target.value)} /></Field>
                  </div>
                </div>)}
              </div>
              <div className="logger-set-actions"><Button variant="secondary" onClick={() => addSet(exercise.id)}><Plus size={17} /> Add set</Button><Button variant="ghost" onClick={() => {
                const last = exercise.sets.at(-1);
                if (last) setExercises((items) => items.map((item) => item.id !== exercise.id ? item : { ...item, sets: [...item.sets, { ...last, id: createId(), setNumber: item.sets.length + 1 }] }));
              }}><Copy size={17} /> Duplicate last</Button></div>
              <textarea aria-label={`Exercise ${exerciseIndex + 1} notes`} className="input logger-notes" value={exercise.notes ?? ""} onChange={(event) => updateExercise(exercise.id, { notes: event.target.value })} placeholder="Exercise notes (optional)" />
            </div>
          </Card>;
        })}
        <Button variant="secondary" className="add-exercise" onClick={() => setExercises((items) => [...items, newExercise()])}><Plus size={18} /> Add another exercise</Button>
        <Field label="Session notes"><textarea className="input logger-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How did the session feel?" /></Field>
        <Card className="logger-bottom-summary"><div><span className="muted">{exercises.filter((item) => item.name).length} exercises · {totalSets} sets</span><strong><WeightDisplay value={totalVolume} unit={unit} /></strong></div>{actions}</Card>
      </div>
      <aside><Card className="logger-summary"><div className="eyebrow">Live summary</div><h2>Session totals</h2>
        <div><span className="muted">Exercises</span><strong>{exercises.filter((item) => item.name).length}</strong></div>
        <div><span className="muted">Total sets</span><strong>{totalSets}</strong></div>
        <div><span className="muted">Working volume</span><strong><WeightDisplay value={totalVolume} unit={unit} /></strong></div>
        <p className="muted">Completed working, drop, and failure sets count toward volume.</p>
        <Button disabled={saving || catalogLoading} onClick={() => void submit("completed")}><Dumbbell size={17} /> {saving ? "Saving…" : initialWorkout ? "Save changes" : "Finish"}</Button>
      </Card></aside>
    </div>
  </div>;
}
