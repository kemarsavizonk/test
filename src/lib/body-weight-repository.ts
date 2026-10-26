"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createId } from "@/lib/fitness";
import { validateBodyWeight, type BodyWeightEntry } from "@/lib/body-weight";

export const BODY_WEIGHT_CHANGED = "kemtech-body-weight-changed";
export const PREVIEW_BODY_WEIGHT_KEY = "kemtech-preview-body-weights-v1";
const changed = () => window.dispatchEvent(new Event(BODY_WEIGHT_CHANGED));
const readPreview = (): BodyWeightEntry[] => {
  const raw = localStorage.getItem(PREVIEW_BODY_WEIGHT_KEY);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Could not read body-weight history on this device.");
  return data as BodyWeightEntry[];
};
function storageError(error: { code?: string; message: string }) {
  if (error.code === "42P01" || error.code === "PGRST205") return new Error("Body-weight storage needs a database update. Please run the body-weight migration in Supabase.");
  if (error.code === "23505") return new Error("An entry already exists for this date. Edit it in your history.");
  return new Error(error.message);
}
async function account() {
  const client = createSupabaseBrowserClient();
  if (!client) return { client: null, user: null };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in again to access your body-weight history.");
  return { client, user: data.user };
}
interface Row { id: string; measured_on: string; weight_kg: number | string; created_at: string; updated_at: string }
const entry = (row: Row): BodyWeightEntry => ({ id: row.id, measuredOn: row.measured_on, weightKg: Number(row.weight_kg), createdAt: row.created_at, updatedAt: row.updated_at });

export async function listBodyWeights(): Promise<BodyWeightEntry[]> {
  const { client, user } = await account();
  if (!client || !user) return readPreview();
  const rows: BodyWeightEntry[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("body_weight_entries").select("id,measured_on,weight_kg,created_at,updated_at").eq("user_id", user.id).order("measured_on", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) throw storageError(error);
    rows.push(...((data ?? []) as Row[]).map(entry));
    if ((data?.length ?? 0) < 500) return rows;
  }
}

export async function saveBodyWeight(input: { id?: string; measuredOn: string; weightKg: number }): Promise<BodyWeightEntry> {
  validateBodyWeight(input.weightKg, input.measuredOn);
  const { client, user } = await account();
  if (!client || !user) {
    const entries = readPreview();
    const existing = input.id ? entries.find((item) => item.id === input.id) : undefined;
    if (input.id && !existing) throw new Error("This body-weight entry no longer exists. Refresh and try again.");
    if (entries.some((item) => item.measuredOn === input.measuredOn && item.id !== input.id)) throw storageError({ code: "23505", message: "Duplicate date" });
    const now = new Date().toISOString();
    const saved = { id: existing?.id ?? createId(), measuredOn: input.measuredOn, weightKg: input.weightKg, createdAt: existing?.createdAt ?? now, updatedAt: now };
    localStorage.setItem(PREVIEW_BODY_WEIGHT_KEY, JSON.stringify([saved, ...entries.filter((item) => item.id !== saved.id)]));
    changed(); return saved;
  }
  const values = { measured_on: input.measuredOn, weight_kg: input.weightKg, updated_at: new Date().toISOString() };
  const result = input.id
    ? await client.from("body_weight_entries").update(values).eq("user_id", user.id).eq("id", input.id).select().single()
    : await client.from("body_weight_entries").insert({ ...values, user_id: user.id }).select().single();
  if (result.error) throw storageError(result.error);
  changed(); return entry(result.data as Row);
}

export async function deleteBodyWeight(id: string) {
  const { client, user } = await account();
  if (!client || !user) localStorage.setItem(PREVIEW_BODY_WEIGHT_KEY, JSON.stringify(readPreview().filter((item) => item.id !== id)));
  else {
    const { error } = await client.from("body_weight_entries").delete().eq("user_id", user.id).eq("id", id);
    if (error) throw storageError(error);
  }
  changed();
}
