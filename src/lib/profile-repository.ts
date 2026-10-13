"use client";

import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { WeightUnit } from "@/lib/types";

export type ProfileSettings = { firstName: string; lastName: string; nickname: string; email: string; unit: WeightUnit; timezone: string; goal: string; weeklyGoal: number };
export const PROFILE_CHANGED = "kemtech-profile-changed";
export const PREVIEW_PROFILE_KEY = "kemtech-preview-settings";
export const defaultProfileSettings: ProfileSettings = { firstName: "", lastName: "", nickname: "", email: "", unit: "lb", timezone: DEFAULT_TIMEZONE, goal: "", weeklyGoal: 3 };

export function preferredName(profile: { firstName?: string; nickname?: string }) {
  return profile.nickname?.trim() || profile.firstName?.trim() || "";
}

export async function loadProfileSettings(): Promise<ProfileSettings> {
  const client = createSupabaseBrowserClient();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!client || !user) {
    try { return { ...defaultProfileSettings, ...JSON.parse(localStorage.getItem(PREVIEW_PROFILE_KEY) ?? "{}") }; }
    catch { return { ...defaultProfileSettings }; }
  }
  const { data, error } = await client.from("profiles").select("first_name,last_name,preferred_weight_unit,timezone,fitness_goal,weekly_workout_goal").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return {
    firstName: data?.first_name ?? user.user_metadata.first_name ?? "",
    lastName: data?.last_name ?? user.user_metadata.last_name ?? "",
    // Auth metadata is account-backed, so no database migration is required.
    nickname: typeof user.user_metadata.nickname === "string" ? user.user_metadata.nickname : "",
    email: user.email ?? "", unit: data?.preferred_weight_unit ?? "lb",
    timezone: data?.timezone ?? DEFAULT_TIMEZONE, goal: data?.fitness_goal ?? "", weeklyGoal: data?.weekly_workout_goal ?? 3,
  };
}

export async function saveProfileSettings(input: ProfileSettings): Promise<ProfileSettings> {
  const settings = { ...input, firstName: input.firstName.trim(), lastName: input.lastName.trim(), nickname: input.nickname.trim() };
  if (settings.nickname.length > 50) throw new Error("Keep your nickname to 50 characters or fewer.");
  const client = createSupabaseBrowserClient();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!client || !user) {
    localStorage.setItem(PREVIEW_PROFILE_KEY, JSON.stringify(settings));
  } else {
    const { error } = await client.from("profiles").update({ first_name: settings.firstName, last_name: settings.lastName, preferred_weight_unit: settings.unit, timezone: settings.timezone, fitness_goal: settings.goal || null, weekly_workout_goal: settings.weeklyGoal }).eq("id", user.id);
    if (error) throw error;
    const { error: metadataError } = await client.auth.updateUser({ data: { nickname: settings.nickname, first_name: settings.firstName, last_name: settings.lastName } });
    if (metadataError) throw metadataError;
  }
  window.dispatchEvent(new Event(PROFILE_CHANGED));
  return settings;
}
