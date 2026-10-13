import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProfileSettings, loadProfileSettings, preferredName, PREVIEW_PROFILE_KEY, saveProfileSettings } from "@/lib/profile-repository";

const client = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => client.current }));

beforeEach(() => { localStorage.clear(); client.current = null; });

describe("profile preferred name", () => {
  it("prefers a trimmed nickname, falls back to first name, and handles an unnamed preview", () => {
    expect(preferredName({ nickname: "  Keem  ", firstName: "Kemar" })).toBe("Keem");
    expect(preferredName({ nickname: "  ", firstName: " Kemar " })).toBe("Kemar");
    expect(preferredName({})).toBe("");
  });
  it("persists preview nicknames and supports clearing them", async () => {
    await saveProfileSettings({ ...defaultProfileSettings, firstName: "Kemar", nickname: " Keem " });
    expect(preferredName(await loadProfileSettings())).toBe("Keem");
    await saveProfileSettings({ ...defaultProfileSettings, firstName: "Kemar", nickname: "" });
    expect(preferredName(await loadProfileSettings())).toBe("Kemar");
  });
  it("loads an account nickname while taking the first name from the profile", async () => {
    client.current = {
      auth: { getUser: async () => ({ data: { user: { id: "owner", email: "user@example.com", user_metadata: { first_name: "Old name", nickname: "Keem" } } } }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { first_name: "Kemar" }, error: null }) }) }) }),
    };
    const profile = await loadProfileSettings();
    expect(profile).toMatchObject({ firstName: "Kemar", nickname: "Keem" });
    expect(preferredName(profile)).toBe("Keem");
  });
  it("saves the nickname to the authenticated account, not browser-only storage", async () => {
    const updateUser = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    client.current = { auth: { getUser: async () => ({ data: { user: { id: "owner" } } }), updateUser }, from: () => ({ update }) };
    await saveProfileSettings({ ...defaultProfileSettings, firstName: "Kemar", lastName: "Savizon", nickname: " Keem " });
    expect(updateUser).toHaveBeenCalledWith({ data: { nickname: "Keem", first_name: "Kemar", last_name: "Savizon" } });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ first_name: "Kemar", last_name: "Savizon" }));
    expect(localStorage.getItem(PREVIEW_PROFILE_KEY)).toBeNull();
    await saveProfileSettings({ ...defaultProfileSettings, firstName: "Kemar", nickname: "" });
    expect(updateUser).toHaveBeenLastCalledWith({ data: { nickname: "", first_name: "Kemar", last_name: "" } });
  });
  it("reports a failed nickname save instead of claiming success", async () => {
    client.current = { auth: { getUser: async () => ({ data: { user: { id: "owner" } } }), updateUser: async () => ({ error: new Error("Could not save nickname") }) }, from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) };
    await expect(saveProfileSettings({ ...defaultProfileSettings, nickname: "Keem" })).rejects.toThrow("Could not save nickname");
  });
});
