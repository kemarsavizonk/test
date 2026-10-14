import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const session = (id: string, day: number, name = "Barbell Back Squat", muscleGroup = "Quadriceps", weight = 50) => ({ id, title: name, status: "completed", performedAt: `2026-10-${day}T12:00:00Z`, createdAt: `2026-10-${day}T12:00:00Z`, updatedAt: `2026-10-${day}T12:00:00Z`, exercises: [{ id: `exercise-${id}`, name, muscleGroup, sets: [{ id: `set-${id}`, setNumber: 1, weight, repetitions: 10, completed: true, type: "working" }] }] });

test("logging more reps and sets alerts and stays read when revisited or units change", async ({ page }) => {
  await page.addInitScript((baseline) => { if (!localStorage.getItem("kemtech-preview-workouts-v1")) localStorage.setItem("kemtech-preview-workouts-v1", JSON.stringify([baseline])); }, session("baseline", 10));
  await page.goto("/dashboard/workouts/new");
  await page.getByRole("combobox", { name: /^Exercise / }).fill("Barbell Back Squat");
  await page.getByLabel("Set 1 weight", { exact: true }).fill("50");
  await page.getByLabel("Set 1 repetitions").fill("12");
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).first().click();
  const tabs = page.getByRole("navigation", { name: "Account navigation" });
  const achievementsTab = tabs.getByRole("link", { name: /Achievements/ });
  await expect(achievementsTab.getByLabel("2 unread achievements", { exact: true })).toBeVisible();
  await achievementsTab.click();
  await expect(page.getByRole("heading", { name: "2 new achievements!", exact: true })).toBeVisible();
  await expect(page.locator('.achievement-row[data-kind="reps"]')).toContainText("24 reps");
  await expect(page.locator('.achievement-row[data-kind="reps"]')).toContainText("Previously 10 reps");
  await expect(page.locator('.achievement-row[data-kind="sets"]')).toContainText("2 sets");
  await expect(page.locator('.achievement-row[data-kind="sets"]')).toContainText("Previously 1 set");
  await expect(page.locator(".achievement-new")).toHaveCount(2);
  await page.screenshot({ path: "/private/tmp/kemtech-count-achievements.png", fullPage: true });
  await tabs.getByRole("link", { name: "Me", exact: true }).click();
  await page.getByRole("combobox", { name: "Weight unit", exact: true }).selectOption("kg");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved.");
  await achievementsTab.click();
  await expect(page.locator(".achievement-new")).toHaveCount(0);
  await expect(page.locator(".achievement-row")).toHaveCount(2);
  await expect(achievementsTab.locator(".notification-badge")).toHaveCount(0);
});

test("history muscle and date filters combine and use the most recent matching log", async ({ page }) => {
  await page.addInitScript((items) => { localStorage.setItem("kemtech-preview-workouts-v1", JSON.stringify(items)); }, [session("older", 10), session("newer", 12, "Barbell Back Squat", "Quadriceps", 60), session("chest", 11, "Barbell Bench Press", "Chest", 80)]);
  await page.goto("/dashboard/workouts");
  await expect(page.locator(".exercise-history-card")).toHaveCount(2);
  await page.getByRole("combobox", { name: "Muscle group", exact: true }).selectOption("Quadriceps");
  await expect(page.locator(".exercise-history-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "From date", exact: true }).fill("2026-10-10");
  await page.getByRole("textbox", { name: "To date", exact: true }).fill("2026-10-10");
  await expect(page.locator(".exercise-history-card")).toContainText("50 lb");
  await expect(page.locator(".exercise-history-card")).toContainText("1 matching log");
  await page.screenshot({ path: "/private/tmp/kemtech-history-filters.png", fullPage: true });
  await page.getByRole("combobox", { name: "Muscle group", exact: true }).selectOption("Chest");
  await expect(page.getByRole("heading", { name: "No matching exercises", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "From date", exact: true }).fill("2026-10-12");
  await expect(page.getByRole("alert").filter({ hasText: "From date must be on or before To date." })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.locator(".exercise-history-card")).toHaveCount(2);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
