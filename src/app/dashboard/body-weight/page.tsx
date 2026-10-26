"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Check, Pencil, Scale, Trash2, X } from "lucide-react";
import { Button, Card, Field, PageHeader } from "@/components/ui";
import { WeightDisplay } from "@/components/weight-display";
import { BodyWeightChart } from "@/components/body-weight-chart";
import { BodyWeightTrend } from "@/components/body-weight-trend";
import { useBodyWeight } from "@/hooks/use-body-weight";
import { buildBodyWeightHistory, type BodyWeightEntry } from "@/lib/body-weight";
import { deleteBodyWeight, saveBodyWeight } from "@/lib/body-weight-repository";
import { fromCanonicalKg, toCanonicalKg } from "@/lib/fitness";
import type { WeightUnit } from "@/lib/types";

export default function BodyWeightPage() {
  const { entries, unit: preferredUnit, loading, error: loadError, refresh } = useBodyWeight();
  const [entryUnit, setEntryUnit] = useState<WeightUnit | null>(null);
  const unit = entryUnit ?? preferredUnit;
  const [weight, setWeight] = useState({ text: "", kg: NaN });
  const [measuredOn, setMeasuredOn] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const history = buildBodyWeightHistory(entries);
  const today = format(new Date(), "yyyy-MM-dd");
  const changeUnit = (next: WeightUnit) => {
    if (Number.isFinite(weight.kg)) setWeight((old) => ({ ...old, text: String(Number(fromCanonicalKg(old.kg, next).toFixed(2))) }));
    setEntryUnit(next);
  };
  const clear = () => { setEditing(null); setWeight({ text: "", kg: NaN }); setMeasuredOn(today); setError(""); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      await saveBodyWeight({ id: editing ?? undefined, measuredOn, weightKg: weight.kg });
      setMessage(editing ? "Body-weight entry updated." : "Body weight recorded.");
      clear(); refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this body weight."); }
    finally { setBusy(false); }
  };
  const edit = (entry: BodyWeightEntry) => {
    setEditing(entry.id); setMeasuredOn(entry.measuredOn); setWeight({ text: String(Number(fromCanonicalKg(entry.weightKg, unit).toFixed(2))), kg: entry.weightKg }); setError(""); setMessage("");
    input.current?.focus(); input.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const remove = async (entry: BodyWeightEntry) => {
    if (!window.confirm(`Delete the body-weight entry for ${format(new Date(`${entry.measuredOn}T12:00:00`), "MMM d, yyyy")}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try { await deleteBodyWeight(entry.id); if (editing === entry.id) clear(); setMessage("Body-weight entry deleted."); refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete this entry."); }
    finally { setBusy(false); }
  };
  return <div className="app-page body-weight-page">
    <Link className="body-weight-back" href="/dashboard"><ArrowLeft size={17} />Dashboard</Link>
    <PageHeader eyebrow="Body-weight tracker" title="Your weight, over time" description="Record a measurement, follow your trend, and keep every entry in one place." />
    {loadError && <div className="logger-error" role="alert">{loadError}<Button variant="ghost" onClick={refresh}>Try again</Button></div>}
    <Card className="body-weight-entry-card"><div className="body-weight-section-title"><span className="body-weight-icon"><Scale size={23} /></span><div><h2>{editing ? "Edit body weight" : "Log body weight"}</h2><p>Enter kg or lb. We’ll show both.</p></div></div>
      <form onSubmit={(event) => void submit(event)} className="body-weight-form" aria-label="Body-weight entry">
        <Field label="Body weight"><input ref={input} aria-label="Body weight" className="input" type="number" inputMode="decimal" min="0.01" step="any" required value={weight.text} onChange={(event) => { const text = event.target.value; setWeight({ text, kg: text ? toCanonicalKg(Number(text), unit) : NaN }); }} aria-describedby="body-weight-equivalent" /><span id="body-weight-equivalent" className="muted body-weight-equivalent">{Number.isFinite(weight.kg) ? <WeightDisplay value={fromCanonicalKg(weight.kg, unit)} unit={unit} compact /> : "Your measurement will display in both units."}</span></Field>
        <Field label="Weight entry unit"><select className="input" value={unit} onChange={(event) => changeUnit(event.target.value as WeightUnit)}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></Field>
        <Field label="Measurement date"><input className="input" type="date" required max={today} value={measuredOn} onChange={(event) => setMeasuredOn(event.target.value)} /></Field>
        <div className="body-weight-form-actions"><Button type="submit" disabled={busy || loading || Boolean(loadError)}><Check size={17} />{busy ? "Saving…" : editing ? "Update weight" : "Save weight"}</Button>{editing && <Button type="button" variant="secondary" onClick={() => { clear(); setMessage(""); }} disabled={busy}><X size={17} />Cancel edit</Button>}</div>
      </form>
      {error && <p className="logger-error" role="alert">{error}</p>}{message && <p className="logger-copy-message" role="status">{message}</p>}
    </Card>
    <Card className="body-weight-chart-card"><div className="body-weight-section-title"><div><h2>Weight trend</h2><p>Measured dates · {unit.toUpperCase()} primary, {unit === "kg" ? "LB" : "KG"} equivalents in details</p></div><span className="body-weight-count">{history.length} entr{history.length === 1 ? "y" : "ies"}</span></div>
      {loading ? <p className="body-weight-empty">Loading your measurements…</p> : history.length ? <BodyWeightChart history={history} unit={unit} /> : <div className="body-weight-empty"><Scale size={30} /><p>No measurements yet. Add your first body weight to start your chart.</p></div>}
    </Card>
    <section className="body-weight-history" aria-label="Body-weight history"><div className="body-weight-section-title"><div><h2>Measurement history</h2><p>Newest measurements first. Changes compare with the previous dated entry.</p></div></div>
      {history.length === 0 ? <Card><p className="body-weight-empty">Your dated entries will appear here.</p></Card> : <div className="body-weight-history-list">{history.map((entry) => <article className="card body-weight-history-entry" key={entry.id}>
        <div className="body-weight-entry-main"><div><time dateTime={entry.measuredOn}>{format(new Date(`${entry.measuredOn}T12:00:00`), "EEEE, MMM d, yyyy")}</time><h3><WeightDisplay value={fromCanonicalKg(entry.weightKg, unit)} unit={unit} /></h3></div><div className="body-weight-entry-actions"><Button variant="ghost" aria-label={`Edit body weight for ${entry.measuredOn}`} disabled={busy} onClick={() => edit(entry)}><Pencil size={17} /></Button><Button variant="ghost" aria-label={`Delete body weight for ${entry.measuredOn}`} disabled={busy} onClick={() => void remove(entry)}><Trash2 size={17} /></Button></div></div>
        <BodyWeightTrend entry={entry} unit={unit} />
      </article>)}</div>}
    </section>
  </div>;
}
