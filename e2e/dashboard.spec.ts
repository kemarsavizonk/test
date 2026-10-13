import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("custom exercise creation resets after navigating away and supports adding several in succession", async ({ page }) => {
  await page.goto("/dashboard/workouts/new");
  const addCustom = () => page.getByRole("link", { name: "Add custom exercise", exact: true });
  await addCustom().click();
  await page.getByRole("textbox", { name: "Exercise name", exact: true }).fill("Custom cable rotation one");
  await page.getByRole("button", { name: "Add to my profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Custom cable rotation one is ready to log" })).toBeVisible();
  await page.getByRole("link", { name: "Back to logger", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Record your session", exact: true })).toBeVisible();
  await addCustom().click();
  await expect(page.getByRole("textbox", { name: "Exercise name", exact: true })).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Custom cable rotation one is ready to log" })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Exercise name", exact: true }).fill("Custom cable rotation two");
  await page.getByRole("button", { name: "Add to my profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Custom cable rotation two is ready to log" })).toBeVisible();
  await page.getByRole("button", { name: "Add another exercise", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Exercise name", exact: true })).toHaveValue("");
  await page.getByRole("textbox", { name: "Exercise name", exact: true }).fill("Custom cable rotation three");
  await page.getByRole("button", { name: "Add to my profile", exact: true }).click();
  await page.getByRole("link", { name: "View exercise catalog", exact: true }).click();
  await page.getByRole("textbox", { name: "Search exercises" }).fill("Custom cable rotation");
  await expect(page.getByRole("heading", { level: 2, name: /Custom cable rotation/ })).toHaveCount(3);
  await page.reload();
  await page.getByRole("textbox", { name: "Search exercises" }).fill("Custom cable rotation");
  await expect(page.getByRole("heading", { level: 2, name: /Custom cable rotation/ })).toHaveCount(3);
});

test("dashboard calendar selects logged days and period tabs update the compact summary", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-13T12:00:00Z"));
  await page.addInitScript(() => {
    const date = "2026-10-13T12:00:00.000Z";
    localStorage.setItem("kemtech-preview-workouts-v1", JSON.stringify([{ id: "dashboard-workout", title: "Barbell Back Squat", status: "completed", performedAt: date, completedAt: date, createdAt: date, updatedAt: date, exercises: [{ id: "exercise", name: "Barbell Back Squat", muscleGroup: "Quadriceps", sets: [{ id: "set", setNumber: 1, weight: 50, repetitions: 10, completed: true, type: "working" }] }] }]));
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Choose training date", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Choose training date" })).toBeVisible();
  // Set the displayed month without depending on the machine's current date.
  const dialog = page.getByRole("dialog", { name: "Choose training date" });
  await expect(dialog.getByText("October 2026", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Tuesday, October 13, 2026", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".dashboard-summary")).toContainText("500 lb");
  await expect(page.getByRole("heading", { name: "Barbell Back Squat", exact: true })).toBeVisible();
  await page.screenshot({ path: "/private/tmp/kemtech-dashboard.png", fullPage: true });
  await page.getByRole("button", { name: "Previous day", exact: true }).click();
  await expect(page.locator(".dashboard-summary")).toContainText("0 lb");
  await expect(page.getByRole("heading", { name: "No workouts recorded for this day" })).toBeVisible();
  await page.getByRole("group", { name: "Dashboard time period" }).getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your week in strength", exact: true })).toBeVisible();
  await expect(page.locator(".dashboard-summary")).toContainText("500 lb");
  await page.getByRole("button", { name: "Choose training date", exact: true }).click();
  await page.screenshot({ path: "/private/tmp/kemtech-dashboard-calendar.png" });
  await dialog.getByRole("button", { name: "Previous calendar month", exact: true }).click();
  await expect(dialog.getByText("September 2026", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
