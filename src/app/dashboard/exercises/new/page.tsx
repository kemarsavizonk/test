"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Button, Card, Field, PageHeader } from "@/components/ui";
import { MUSCLE_GROUPS } from "@/lib/constants";
import { createCustomExercise, type CatalogExercise } from "@/lib/exercise-repository";

export default function NewExercisePage() {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<string>(MUSCLE_GROUPS[0]);
  const [equipment, setEquipment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<CatalogExercise | null>(null);
  const shouldReset = useRef(false);
  const reset = () => {
    shouldReset.current = false;
    setSaved(null); setName(""); setMuscleGroup(MUSCLE_GROUPS[0]); setEquipment(""); setError("");
  };
  // Cache Components retains this route. Clear the completed transaction when
  // Activity hides it so the next visit can create another exercise.
  useLayoutEffect(() => () => {
    if (shouldReset.current) {
      shouldReset.current = false;
      setSaved(null); setName(""); setMuscleGroup(MUSCLE_GROUPS[0]); setEquipment(""); setError("");
    }
  }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const exercise = await createCustomExercise({ name, muscleGroup, equipment });
      setSaved(exercise);
      shouldReset.current = true;
      setName(""); setMuscleGroup(MUSCLE_GROUPS[0]); setEquipment("");
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the exercise."); }
    finally { setSaving(false); }
  };
  return <div className="app-page"><PageHeader eyebrow="Custom exercise" title="Add an exercise to your profile" description="Save it here first. Then return to the logger and search for its name to record your sets." />
    <Card className="custom-exercise-form">{saved ? <div className="custom-exercise-success"><Check size={32} /><h2>{saved.name} is ready to log</h2><p>It has been added to your exercise catalog. You can add another exercise whenever you need.</p><Button onClick={reset}><Plus size={17} /> Add another exercise</Button><Link className="btn btn-secondary" href="/dashboard/workouts/new">Back to logger</Link><Link className="btn btn-secondary" href="/dashboard/exercises">View exercise catalog</Link></div> : <form onSubmit={(event) => void save(event)}>
      <Field label="Exercise name"><input className="input" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Smith Machine Deadlift" /></Field>
      <Field label="Muscle group"><select className="input" value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}>{MUSCLE_GROUPS.map((group) => <option key={group}>{group}</option>)}</select></Field>
      <Field label="Equipment (optional)"><input className="input" maxLength={100} value={equipment} onChange={(event) => setEquipment(event.target.value)} placeholder="e.g. Smith Machine" /></Field>
      {error && <p className="logger-error" role="alert">{error}</p>}
      <div className="custom-exercise-actions"><Button type="submit" disabled={saving}><Plus size={18} /> {saving ? "Saving…" : "Add to my profile"}</Button><Link href="/dashboard/workouts/new" className="btn btn-secondary">Back to logger</Link></div>
    </form>}</Card>
  </div>;
}
