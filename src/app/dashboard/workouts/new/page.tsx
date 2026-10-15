import { Suspense } from "react";
import { NewWorkoutStart } from "@/components/new-workout-start";
export default function NewWorkoutPage() { return <Suspense fallback={<div className="app-page muted">Loading workout logger…</div>}><NewWorkoutStart /></Suspense>; }
