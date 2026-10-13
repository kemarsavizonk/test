import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <Suspense fallback={<div className="app-page muted">Loading your account…</div>}><AppShell>{children}</AppShell></Suspense>; }
