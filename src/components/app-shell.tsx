"use client";

import { BarChart3, BookOpen, Dumbbell, Home, LogOut, Medal, Menu, Plus, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home, exact: true },
  { href: "/dashboard/workouts/new", label: "Log workout", icon: Plus },
  { href: "/dashboard/workouts", label: "History", icon: Dumbbell, exact: true },
  { href: "/dashboard/exercises", label: "Exercises", icon: BookOpen },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/records", label: "Records", icon: Medal },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  const signOut = async () => { await createSupabaseBrowserClient()?.auth.signOut(); router.push("/"); router.refresh(); };
  const nav = <>{items.map(({ href, label, icon: Icon, exact }) => { const active = exact ? path === href : path.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, color: active ? "#1642bb" : "#475569", background: active ? "#eff4ff" : "transparent", fontWeight: active ? 800 : 650, fontSize: 14 }}><Icon size={19} />{label}</Link>; })}</>;
  return <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
    <aside className="desktop-only" style={{ width: 242, position: "fixed", inset: "0 auto 0 0", padding: "25px 18px", borderRight: "1px solid #e2e8f0", background: "white", display: "flex", flexDirection: "column", zIndex: 20 }}><div style={{ padding: "0 5px 28px" }}><Logo /></div><nav style={{ display: "grid", gap: 4 }}>{nav}</nav><div style={{ marginTop: "auto", display: "grid", gap: 5 }}><Link href="/dashboard/settings" style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, color: "#475569", fontWeight: 650, fontSize: 14 }}><Settings size={19} />Settings</Link><button onClick={signOut} className="btn btn-ghost" style={{ justifyContent: "flex-start", paddingInline: 12 }}><LogOut size={19} />Sign out</button></div></aside>
    <header className="mobile-only" style={{ position: "sticky", top: 0, height: 66, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "rgba(255,255,255,.94)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", zIndex: 50 }}><Logo /><button className="btn btn-ghost" aria-label="Open navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></header>
    {open && <div className="mobile-only" style={{ position: "fixed", inset: "66px 0 0", background: "rgba(15,23,42,.28)", zIndex: 40 }} onClick={() => setOpen(false)}><nav onClick={(event) => event.stopPropagation()} style={{ padding: 15, background: "white", display: "grid", gap: 3, boxShadow: "0 18px 45px rgba(15,23,42,.14)" }}>{nav}<Link href="/dashboard/settings" onClick={() => setOpen(false)} style={{ display: "flex", gap: 12, padding: 12, color: "#475569", fontWeight: 650 }}><Settings size={19} />Settings</Link></nav></div>}
    <main style={{ minHeight: "100vh" }} className="shell-main">{children}</main>
    <style jsx global>{`@media(min-width:761px){.shell-main{margin-left:242px}}`}</style>
  </div>;
}
