"use client";

import { Bell, LockKeyhole, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader } from "@/components/ui";
import { InstallApp } from "@/components/install-app";
import { defaultProfileSettings, loadProfileSettings, saveProfileSettings, type ProfileSettings } from "@/lib/profile-repository";

export default function SettingsPage() {
  const [form, setForm] = useState(defaultProfileSettings);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void loadProfileSettings().then((profile) => { if (active) setForm(profile); })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Could not load your profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const change = (key: keyof ProfileSettings, value: string | number) => setForm((old) => ({ ...old, [key]: value }));
  const save = async () => {
    setBusy(true); setMessage("");
    try { setForm(await saveProfileSettings(form)); setMessage("Preferences saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save your preferences."); }
    finally { setBusy(false); }
  };
  return <div className="app-page"><PageHeader eyebrow="Account settings" title="Make KemTech yours" description="Control the personal details and defaults used throughout your private training workspace."/><InstallApp /><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 280px",gap:20}} className="settings-grid"><div style={{display:"grid",gap:18}}><Card style={{padding:23}}><div style={{display:"flex",gap:12,alignItems:"center",marginBottom:22}}><span style={{width:40,height:40,display:"grid",placeItems:"center",borderRadius:12,background:"#eff4ff",color:"#1642bb"}}><UserRound size={20}/></span><div><h2 style={{fontSize:18,margin:0}}>Profile</h2><p className="muted" style={{fontSize:12,margin:"4px 0 0"}}>Your account identity</p></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}} className="settings-fields"><Field label="First name"><input className="input" value={form.firstName} onChange={e=>change("firstName",e.target.value)}/></Field><Field label="Last name"><input className="input" value={form.lastName} onChange={e=>change("lastName",e.target.value)}/></Field><Field label="Nickname" hint="Optional. We’ll use this name instead of your first name."><input className="input" value={form.nickname} maxLength={50} autoComplete="nickname" placeholder="Your preferred name" onChange={e=>change("nickname",e.target.value)}/></Field><Field label="Email address"><input className="input" value={form.email} readOnly placeholder="Set by your account"/></Field><Field label="Timezone"><input className="input" value={form.timezone} onChange={e=>change("timezone",e.target.value)}/></Field></div></Card><Card style={{padding:23}}><div style={{display:"flex",gap:12,alignItems:"center",marginBottom:22}}><span style={{width:40,height:40,display:"grid",placeItems:"center",borderRadius:12,background:"#eff4ff",color:"#1642bb"}}><Bell size={20}/></span><div><h2 style={{fontSize:18,margin:0}}>Training preferences</h2><p className="muted" style={{fontSize:12,margin:"4px 0 0"}}>Defaults used in workouts and reports</p></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}} className="settings-fields"><Field label="Weight unit"><select className="input" value={form.unit} onChange={e=>change("unit",e.target.value)}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></Field><Field label="Weekly workout goal"><input className="input" type="number" min="1" max="14" value={form.weeklyGoal} onChange={e=>change("weeklyGoal",Number(e.target.value))}/></Field><Field label="Primary fitness goal"><input className="input" value={form.goal} onChange={e=>change("goal",e.target.value)} placeholder="e.g. Build strength"/></Field></div></Card>{message&&<div role="status" style={{padding:13,borderRadius:10,background:"#eff4ff",color:"#1642bb"}}>{message}</div>}<Button onClick={()=>void save()} disabled={busy || loading} style={{justifySelf:"start"}}><Save size={17}/>{busy?"Saving…":loading?"Loading…":"Save changes"}</Button></div><aside><Card style={{padding:22}}><LockKeyhole size={23} color="#1642bb"/><h2 style={{fontSize:18,margin:"17px 0 8px"}}>Private by design</h2><p className="muted" style={{fontSize:13,lineHeight:1.65,margin:0}}>Row-level security isolates every user&apos;s profile, sessions, sets, templates, custom exercises, and records at the database layer.</p></Card></aside></div><style jsx>{`@media(max-width:850px){.settings-grid{grid-template-columns:1fr!important}}@media(max-width:600px){.settings-fields{grid-template-columns:1fr!important}}`}</style></div>}
