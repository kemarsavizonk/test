import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return <article className="card" style={{ padding: 21 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="muted" style={{ fontWeight: 750, fontSize: 13 }}>{label}</span><span style={{ width: 36, height: 36, display: "grid", placeItems: "center", color: "#1642bb", background: "#eff4ff", borderRadius: 10 }}><Icon size={18} /></span></div><strong style={{ fontSize: 28, letterSpacing: "-.04em", display: "block", marginTop: 15 }}>{value}</strong><span className="muted" style={{ fontSize: 12 }}>{detail}</span></article>;
}
