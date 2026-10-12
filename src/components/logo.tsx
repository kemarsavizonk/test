import { Activity } from "lucide-react";
import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="Kemtech Inc. home" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 850, letterSpacing: "-.03em" }}>
      <span style={{ width: 36, height: 36, display: "grid", placeItems: "center", color: "white", background: "#1642bb", borderRadius: 11 }}><Activity size={21} strokeWidth={2.5} /></span>
      {!compact && <span style={{ fontSize: 20 }}>Kemtech <span style={{ color: "#1642bb" }}>Inc.</span></span>}
    </Link>
  );
}
