"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { convertWeight } from "@/lib/fitness";
import { formatNumber } from "@/lib/utils";
import { copyExercise, suggestedWorkoutTitle, type ReuseEntry } from "@/lib/workout-reuse";
import type { WeightUnit, WorkoutExercise, WorkoutSet } from "@/lib/types";

function ReuseWeightInput({ value, unit, label, onChange }: { value: number; unit: WeightUnit; label: string; onChange: (value: number) => void }) {
  // Keep typed decimals intact; only shorten the resting display, never stored weights.
  const [draft, setDraft] = useState<string | null>(null);
  return <input className="input" type="number" min="0" step="any" inputMode="decimal" aria-label={label} aria-description={`Weight in ${unit}`} value={draft ?? Number(value.toFixed(2))} onBlur={() => setDraft(null)} onChange={(event) => {
    const text = event.target.value;
    setDraft(text);
    onChange(Number(text));
  }} />;
}

export function WorkoutReuseDialog({ entries, unit, plan = false, planDate, description, onUse, onClose }: {
  entries: ReuseEntry[]; unit: WeightUnit; plan?: boolean; planDate?: string; description?: string;
  onUse: (exercises: WorkoutExercise[], unit: WeightUnit) => void; onClose: () => void;
}) {
  const [rows, setRows] = useState(() => entries.map((entry) => ({ ...entry, included: true, sets: entry.exercise.sets.map((set) => ({ ...set, selected: true })) })));
  const [error, setError] = useState("");
  const [entryUnit, setEntryUnit] = useState<WeightUnit>(unit);
  const secondaryUnit = entryUnit === "lb" ? "kg" : "lb";
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]') ?? []).filter((item) => item.getClientRects().length);
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, []);
  const updateSet = (exerciseIndex: number, setIndex: number, patch: Partial<WorkoutSet> & { selected?: boolean }) => setRows((items) => items.map((item, i) => i !== exerciseIndex ? item : { ...item, sets: item.sets.map((set, j) => j === setIndex ? { ...set, ...patch } : set) }));
  const changeEntryUnit = (nextUnit: WeightUnit) => {
    if (nextUnit === entryUnit) return;
    // Convert every row, including unchecked sets and excluded plan exercises.
    setRows((items) => items.map((item) => ({ ...item, sets: item.sets.map((set) => ({ ...set, weight: convertWeight(set.weight, entryUnit, nextUnit) })) })));
    setEntryUnit(nextUnit);
  };
  const useChecked = () => {
    const selected = rows.filter((row) => row.included).map((row) => ({ ...row.exercise, sets: row.sets.filter((set) => set.selected).map(({ selected: _selected, ...set }) => set) })).filter((exercise) => exercise.sets.length);
    if (!selected.length) { setError("Check at least one set to reuse."); return; }
    if (selected.some((exercise) => exercise.sets.some((set) => !Number.isFinite(set.weight) || set.weight < 0 || !Number.isInteger(set.repetitions) || set.repetitions < 1 || (set.rpe != null && (!Number.isFinite(set.rpe) || set.rpe < 1 || set.rpe > 10))))) { setError("Enter a non-negative weight, whole reps of at least 1, and an RPE from 1 to 10 if used."); return; }
    onUse(selected.map((exercise) => copyExercise(exercise, { completed: plan ? false : undefined })), entryUnit);
  };
  if (typeof document === "undefined") return null;
  return createPortal(<div className="reuse-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={root} role="dialog" aria-modal="true" aria-labelledby="reuse-title" tabIndex={-1} className="reuse-dialog">
    <header className="reuse-header"><div><div className="eyebrow">{plan ? "Your training pattern" : "Previous exercise log"}</div><h2 id="reuse-title">{plan ? (planDate ? suggestedWorkoutTitle(planDate) : "Suggested Workout Plan") : "Reuse a previous entry"}</h2></div><Button variant="ghost" aria-label="Close reuse preview" onClick={onClose}><X size={21} /></Button></header>
    <p className="reuse-description">{description ?? "Edit or check sets to copy. Your saved history stays unchanged."}{plan && " Copied sets start incomplete; mark them complete as you train."}</p>
    <div className="reuse-unit-toolbar"><span>Enter weights in</span><div className="reuse-unit-toggle" role="group" aria-label="Preview weight unit">{(["kg", "lb"] as WeightUnit[]).map((value) => <button key={value} type="button" aria-pressed={entryUnit === value} aria-label={value === "kg" ? "Kilograms (kg)" : "Pounds (lb)"} onClick={() => changeEntryUnit(value)}>{value.toUpperCase()}</button>)}</div></div>
    <div className="reuse-entries">{rows.map((row, i) => <section className="reuse-exercise" key={row.exercise.id}>
      <div className="reuse-exercise-heading">{plan && <input type="checkbox" aria-label={`Include ${row.exercise.name}`} checked={row.included} onChange={(event) => setRows((items) => items.map((item, index) => index === i ? { ...item, included: event.target.checked } : item))} />}<div><h3>{row.exercise.name}</h3><p>{row.exercise.muscleGroup}{row.exercise.equipment ? ` · ${row.exercise.equipment}` : ""} · {format(new Date(row.performedAt), "MMM d, yyyy")}</p></div></div>
      {row.included && <><div className="reuse-set-headings" aria-hidden="true"><span>Set</span><span>Weight ({entryUnit})</span><span>Reps</span><span>Set type</span><span>RPE</span></div>{row.sets.map((set, j) => <div className="reuse-set" key={`${set.id}:${j}`}>
        <label className="reuse-set-check" title={!set.completed ? "Previously incomplete" : `Set ${j + 1}`}><input type="checkbox" checked={set.selected} aria-label={`Reuse ${row.exercise.name} set ${j + 1}${!set.completed ? " (previously incomplete)" : ""}`} onChange={(event) => updateSet(i, j, { selected: event.target.checked })} /><strong>{j + 1}</strong></label>
        <div className="reuse-weight"><ReuseWeightInput key={entryUnit} value={set.weight} unit={entryUnit} label={`${row.exercise.name} previous set ${j + 1} weight`} onChange={(weight) => updateSet(i, j, { weight })} /><small>{formatNumber(convertWeight(set.weight, entryUnit, secondaryUnit), 1)} {secondaryUnit}</small></div>
        <input className="input" type="number" min="1" step="1" inputMode="numeric" aria-label={`${row.exercise.name} previous set ${j + 1} reps`} value={set.repetitions} onChange={(event) => updateSet(i, j, { repetitions: Number(event.target.value) })} />
        <select className="input" aria-label={`${row.exercise.name} previous set ${j + 1} type`} value={set.type} onChange={(event) => updateSet(i, j, { type: event.target.value as WorkoutSet["type"] })}>{[{ value: "warmup", label: "Warm" }, { value: "working", label: "Work" }, { value: "drop", label: "Drop" }, { value: "failure", label: "Fail" }].map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <input className="input" type="number" min="1" max="10" step="0.5" inputMode="decimal" aria-label={`${row.exercise.name} previous set ${j + 1} RPE`} value={set.rpe ?? ""} placeholder="—" onChange={(event) => updateSet(i, j, { rpe: event.target.value ? Number(event.target.value) : undefined })} />
      </div>)}</>}
    </section>)}</div>
    {error && <p className="logger-error" role="alert">{error}</p>}
    <footer className="reuse-actions"><Button onClick={() => onUse(entries.map((entry) => copyExercise(entry.exercise, { from: unit, to: entryUnit, completed: plan ? false : undefined })), entryUnit)}>{plan ? "Use entire plan as is" : "Reuse entry as is"}</Button><Button variant="secondary" onClick={useChecked}>Use checked sets</Button><Button variant="ghost" onClick={onClose}>{plan ? "Cancel plan" : "Start fresh"}</Button></footer>
  </div></div>, document.body);
}
