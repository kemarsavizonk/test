import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteBodyWeight, listBodyWeights, PREVIEW_BODY_WEIGHT_KEY, saveBodyWeight } from "@/lib/body-weight-repository";

const client = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => client.current }));
beforeEach(() => { localStorage.clear(); client.current = null; });
const row = { id: "weight-id", measured_on: "2020-10-20", weight_kg: "81.6466", created_at: "2020-10-20T12:00:00Z", updated_at: "2020-10-20T12:00:00Z" };
const auth = { getUser: async () => ({ data: { user: { id: "owner-id" } }, error: null }) };

describe("body-weight storage", () => {
  it("saves, lists, edits, and deletes preview entries without creating duplicates", async () => {
    const saved = await saveBodyWeight({ measuredOn: "2020-10-20", weightKg: 80 });
    await expect(saveBodyWeight({ measuredOn: "2020-10-20", weightKg: 81 })).rejects.toThrow("already exists");
    const edited = await saveBodyWeight({ id: saved.id, measuredOn: "2020-10-21", weightKg: 82 });
    expect(edited).toMatchObject({ id: saved.id, createdAt: saved.createdAt, weightKg: 82 });
    expect(await listBodyWeights()).toEqual([edited]);
    await expect(saveBodyWeight({ id: "missing", measuredOn: "2020-10-21", weightKg: 80 })).rejects.toThrow("no longer exists");
    await deleteBodyWeight(saved.id);
    expect(await listBodyWeights()).toEqual([]);
  });
  it("never overwrites unreadable preview history", async () => {
    localStorage.setItem(PREVIEW_BODY_WEIGHT_KEY, "not json");
    await expect(saveBodyWeight({ measuredOn: "2020-10-20", weightKg: 80 })).rejects.toThrow();
    expect(localStorage.getItem(PREVIEW_BODY_WEIGHT_KEY)).toBe("not json");
  });
  it("saves authenticated canonical kg to the owner and scopes edits/deletes", async () => {
    const single = vi.fn(async () => ({ data: row, error: null }));
    const query = { eq: vi.fn(() => query), select: () => ({ single }) };
    const insert = vi.fn(() => query), update = vi.fn(() => query), remove = vi.fn(() => query);
    client.current = { auth, from: vi.fn(() => ({ insert, update, delete: remove })) };
    expect(await saveBodyWeight({ measuredOn: row.measured_on, weightKg: 81.6466 })).toMatchObject({ weightKg: 81.6466, measuredOn: row.measured_on });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "owner-id", weight_kg: 81.6466 }));
    await saveBodyWeight({ id: row.id, measuredOn: row.measured_on, weightKg: 82 });
    await deleteBodyWeight(row.id);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ weight_kg: 82 }));
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner-id");
    expect(query.eq).toHaveBeenCalledWith("id", row.id);
    expect(localStorage.getItem(PREVIEW_BODY_WEIGHT_KEY)).toBeNull();
  });
  it("loads history beyond the first page using owner filters", async () => {
    const rows = Array.from({ length: 501 }, (_, index) => ({ ...row, id: `weight-${index}` }));
    const query = { eq: vi.fn(() => query), order: () => query, range: vi.fn(async (start: number, end: number) => ({ data: rows.slice(start, end + 1), error: null })) };
    client.current = { auth, from: () => ({ select: () => query }) };
    expect(await listBodyWeights()).toHaveLength(501);
    expect(query.range).toHaveBeenCalledWith(500, 999);
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner-id");
  });
  it("reports missing schema and duplicate dates clearly", async () => {
    const query = { eq: () => query, order: () => query, range: async () => ({ error: { code: "PGRST205", message: "missing" }, data: null }) };
    client.current = { auth, from: () => ({ select: () => query, insert: () => ({ select: () => ({ single: async () => ({ error: { code: "23505", message: "duplicate" } }) }) }) }) };
    await expect(listBodyWeights()).rejects.toThrow("database update");
    await expect(saveBodyWeight({ measuredOn: row.measured_on, weightKg: 80 })).rejects.toThrow("already exists");
  });
  it("does not silently fall back to local storage when authenticated access fails", async () => {
    client.current = { auth: { getUser: async () => ({ data: { user: null }, error: { message: "expired" } }) } };
    await expect(saveBodyWeight({ measuredOn: "2020-10-20", weightKg: 80 })).rejects.toThrow("sign in again");
    await expect(listBodyWeights()).rejects.toThrow("sign in again");
    await expect(deleteBodyWeight("weight-id")).rejects.toThrow("sign in again");
    expect(localStorage.getItem(PREVIEW_BODY_WEIGHT_KEY)).toBeNull();
  });
});
