import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <section className={cn("card", className)} style={style}>{children}</section>;
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={cn("btn", `btn-${variant}`, className)} {...props}>{children}</button>;
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "gray" | "red" }) {
  const colors = { blue: ["#eff4ff", "#1642bb"], green: ["#f0fdf4", "#15803d"], gray: ["#f1f5f9", "#475569"], red: ["#fef2f2", "#dc2626"] }[tone];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 9px", borderRadius: 99, background: colors[0], color: colors[1], fontWeight: 750, fontSize: 12 }}>{children}</span>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 26, flexWrap: "wrap" }}>
    <div style={{ minWidth: 0 }}>{eyebrow && <div className="eyebrow" style={{ marginBottom: 7 }}>{eyebrow}</div>}<h1 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-.045em", lineHeight: 1.08 }}>{title}</h1>{description && <p className="muted" style={{ maxWidth: 650, margin: "9px 0 0", lineHeight: 1.6 }}>{description}</p>}</div>
    {action}
  </header>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div style={{ display: "grid", justifyItems: "center", textAlign: "center", padding: "58px 22px" }}><div style={{ width: 54, height: 54, borderRadius: 16, display: "grid", placeItems: "center", color: "#1642bb", background: "#eff4ff", marginBottom: 16 }}>{icon}</div><h3 style={{ margin: 0, fontSize: 20 }}>{title}</h3><p className="muted" style={{ maxWidth: 440, lineHeight: 1.6, margin: "9px 0 20px" }}>{description}</p>{action}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label style={{ display: "grid", gap: 7, minWidth: 0 }}><span style={{ fontWeight: 750, fontSize: 14 }}>{label}</span>{children}{hint && <span className="muted" style={{ fontSize: 12 }}>{hint}</span>}</label>;
}
