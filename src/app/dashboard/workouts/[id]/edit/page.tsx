"use client";

import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WorkoutBuilder } from "@/components/workout-builder";
import { Card, EmptyState } from "@/components/ui";
import { getPreferredWeightUnit, listWorkouts } from "@/lib/workout-repository";
import type { WeightUnit, WorkoutSession } from "@/lib/types";

export default function EditWorkoutPage() {
  const params = useParams<{ id: string }>();
  const [workout, setWorkout] = useState<WorkoutSession>();
  const [unit, setUnit] = useState<WeightUnit>("lb");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([listWorkouts(), getPreferredWeightUnit()]).then(([items, preferredUnit]) => {
      if (!active) return;
      setWorkout(items.find((item) => item.id === params.id));
      setUnit(preferredUnit);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  if (loading) return <div className="app-page muted">Loading workout…</div>;
  if (!workout) return <div className="app-page"><Card><EmptyState icon={<Dumbbell />} title="Workout not found" description="This workout may have been deleted or belongs to another account." action={<Link href="/dashboard/workouts" className="btn btn-primary">Back to history</Link>} /></Card></div>;
  return <WorkoutBuilder initialWorkout={workout} initialUnit={unit} />;
}
