import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

function workout(id: string, weight: number, day: number) {
  return { id, title: "Barbell Back Squat + Barbell Bench Press", status: "completed", performedAt: `2026-10-${day}T12:00:00Z`, completedAt: `2026-10-${day}T13:00:00Z`, createdAt: `2026-10-${day}T12:00:00Z`, updatedAt: `2026-10-${day}T12:00:00Z`, exercises: [{ id: `exercise-${id}`, name: "Barbell Back Squat", muscleGroup: "Quadriceps", equipment: "Barbell", sets: [{ id: `set-${id}`, setNumber: 1, weight, repetitions: 10, completed: true, type: "working" }] }] };
}

test("repeated logs appear under one exercise and show newest-first lift comparisons", async ({ page }) => {
  const first = workout("first", 50, 10);
  first.exercises.push({ ...first.exercises[0], id: "bench-log", name: "Barbell Bench Press", muscleGroup: "Chest" });
  await page.addInitScript((items) => {
    if (!localStorage.getItem("kemtech-preview-workouts-v1")) localStorage.setItem("kemtech-preview-workouts-v1", JSON.stringify(items));
  }, [first, workout("increase", 60, 11), workout("equal", 60, 12), workout("decrease", 55, 13)]);
  await page.goto("/dashboard/workouts");
  await expect(page.locator(".exercise-history-card")).toHaveCount(2);
  const squat = page.getByRole("link", { name: "View Barbell Back Squat history", exact: true });
  await expect(squat).toContainText("4 logs");
  await expect(squat).toContainText("Less than last lift");
  await squat.click();
  await expect(page.locator(".exercise-log")).toHaveCount(4);
  await expect(page.locator(".exercise-log").first().locator("time")).toHaveAttribute("datetime", "2026-10-13T12:00:00Z");
  await expect(page.locator(".exercise-log").nth(0)).toContainText("Less than last lift");
  await expect(page.locator(".exercise-log").nth(1)).toContainText("Same as last lift");
  await expect(page.locator(".exercise-log").nth(2)).toContainText("More than last lift");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "/private/tmp/kemtech-exercise-history.png", fullPage: true });
  // Delete only the squat from the multi-exercise first session; keep bench.
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator(".exercise-log").last().getByRole("button", { name: "Delete log", exact: true }).click();
  await expect(page.locator(".exercise-log")).toHaveCount(3);
  await page.getByRole("link", { name: "Back to history", exact: true }).click();
  await expect(page.getByRole("link", { name: "View Barbell Bench Press history", exact: true })).toBeVisible();
});

test("a custom exercise is saved to the profile, found in the logger, and logged repeatedly under one history card", async ({ page }) => {
  await page.goto("/dashboard/workouts/new");
  await page.getByRole("link", { name: "Add custom exercise", exact: true }).click();
  await page.getByLabel("Exercise name", { exact: true }).fill("Cable Press / Rotation");
  await page.getByRole("combobox", { name: "Muscle group", exact: true }).selectOption("Core and Abs");
  await page.getByLabel("Equipment (optional)").fill("Cable machine");
  await page.getByRole("button", { name: "Add to my profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cable Press / Rotation is ready to log" })).toBeVisible();
  await page.getByRole("link", { name: "Back to logger", exact: true }).click();
  const search = page.getByRole("combobox", { name: /^Exercise / });
  await search.fill("Cable Press /");
  await page.getByRole("listbox").getByRole("option", { name: /Cable Press \/ Rotation/ }).click();
  await expect(page.getByRole("combobox", { name: /^Muscle group/ })).toHaveValue("Core and Abs");
  await expect(page.getByRole("textbox", { name: /^Equipment/ })).toHaveValue("Cable machine");
  await page.getByLabel("Set 1 weight", { exact: true }).fill("30");
  await page.getByLabel("Set 1 repetitions").fill("10");
  await page.getByRole("button", { name: "Finish", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Your exercise history", exact: true })).toBeVisible();
  await page.goto("/dashboard/workouts/new");
  await search.fill("Cable Press / Rotation");
  await page.getByRole("dialog", { name: "Reuse a previous entry" }).getByRole("button", { name: "Start fresh", exact: true }).click();
  await page.getByLabel("Set 1 weight", { exact: true }).fill("35");
  await page.getByLabel("Set 1 repetitions").fill("10");
  await page.getByRole("button", { name: "Finish", exact: true }).first().click();
  await expect(page.locator(".exercise-history-card")).toHaveCount(1);
  await page.getByRole("link", { name: "View Cable Press / Rotation history", exact: true }).click();
  await expect(page.locator(".exercise-log")).toHaveCount(2);
  await expect(page.locator(".exercise-log").first()).toContainText("More than last lift");
  await page.goto("/dashboard/exercises/new");
  await page.getByLabel("Exercise name", { exact: true }).fill("  cable PRESS / rotation  ");
  await page.getByRole("button", { name: "Add to my profile", exact: true }).click();
  await expect(page.locator(".logger-error[role=alert]")).toContainText("already exists");
});
