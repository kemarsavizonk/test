"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button, Field } from "@/components/ui";
import { validateSignupConfirmation } from "@/lib/auth-validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const submit = async (formData: FormData) => {
    setBusy(true); setError(""); setMessage("");
    const email = String(formData.get("email") ?? "").trim(); const password = String(formData.get("password") ?? "");
    const confirmEmail = String(formData.get("confirmEmail") ?? "").trim(); const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) { setError("Enter a valid email address."); setBusy(false); return; }
    if (mode === "signup") {
      const mismatch = validateSignupConfirmation(email, confirmEmail, password, confirmPassword);
      if (mismatch) { setError(mismatch); setBusy(false); return; }
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("Account access needs Supabase configuration. You can still explore the local preview."); setBusy(false); return; }
    try {
      if (mode === "login") {
        if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) throw authError;
        router.push("/dashboard"); router.refresh();
      } else if (mode === "signup") {
        const firstName = String(formData.get("firstName") ?? "").trim(); const lastName = String(formData.get("lastName") ?? "").trim();
        if (!firstName || !lastName) throw new Error("Enter your first and last name.");
        if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
        const { error: authError } = await supabase.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName }, emailRedirectTo: `${window.location.origin}/auth/callback` } }); if (authError) throw authError;
        setMessage("Check your inbox to confirm your account, then sign in.");
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings` }); if (authError) throw authError;
        setMessage("If that address has an account, a password reset link is on its way.");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  };
  return <form onSubmit={(event) => { event.preventDefault(); void submit(new FormData(event.currentTarget)); }} style={{ display: "grid", gap: 17 }}>
    {mode === "signup" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="First name"><input className="input" name="firstName" autoComplete="given-name" required /></Field><Field label="Last name"><input className="input" name="lastName" autoComplete="family-name" required /></Field></div>}
    <Field label="Email address"><input className="input" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></Field>
    {mode === "signup" && <Field label="Confirm email address"><input className="input" name="confirmEmail" type="email" autoComplete="email" required placeholder="Enter your email again" /></Field>}
    {mode !== "forgot" && <Field label="Password" hint={mode === "signup" ? "Use at least 8 characters." : undefined}><input className="input" name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></Field>}
    {mode === "signup" && <Field label="Confirm password"><input className="input" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></Field>}
    {error && <div role="alert" style={{ padding: 12, borderRadius: 10, color: "#b91c1c", background: "#fef2f2", fontSize: 14, lineHeight: 1.5 }}>{error}</div>}
    {message && <div role="status" style={{ padding: 12, borderRadius: 10, color: "#166534", background: "#f0fdf4", fontSize: 14, lineHeight: 1.5 }}>{message}</div>}
    <Button disabled={busy} type="submit">{busy && <LoaderCircle size={17} className="animate-spin" />}{mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</Button>
    {mode === "login" && <Link href="/forgot-password" style={{ textAlign: "center", color: "#1642bb", fontWeight: 700, fontSize: 14 }}>Forgot your password?</Link>}
  </form>;
}
