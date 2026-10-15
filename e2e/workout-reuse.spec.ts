import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

function session(id: string, day: string, weight = 50, multiple = false) {
  const date = `${day}T12:00:00Z`;
  const exercises = [{ id: `exercise-${id}`, name: "Barbell Back Squat", muscleGroup: "Quadriceps", equipment: "Smith Machine", notes: "Original exercise notes", sets: [1, 2].map((index) => ({ id: `set-${id}-${index}`, setNumber: index, weight: weight + (index - 1) * 5, repetitions: index === 1 ? 10 : 8, rpe: 8, completed: true, type: "working" })) }];
  if (multiple) exercises.push({ ...exercises[0], id: `bench-${id}`, name: "Barbell Bench Press", muscleGroup: "Chest", sets: exercises[0].sets.map((set) => ({ ...set, id: `bench-${set.id}` })) });
  return { id, title: "Previous training", status: "completed", performedAt: date, createdAt: date, updatedAt: date, exercises };
}

async function seed(page: Page, items: ReturnType<typeof session>[]) {
  await page.addInitScript((workouts) => { if (!localStorage.getItem("kemtech-preview-workouts-v1")) localStorage.setItem("kemtech-preview-workouts-v1", JSON.stringify(workouts)); }, items);
}

test("reuse selected edited sets creates a new workout and leaves original details unchanged", async ({ page }) => {
  const source = session("source", "2026-10-08");
  await seed(page, [source]);
  await page.goto("/dashboard/workouts/new");
  await page.getByRole("combobox", { name: /^Exercise / }).fill("Barbell Back Squat");
  const dialog = page.getByRole("dialog", { name: "Reuse a previous entry", exact: true });
  await expect(dialog).toContainText("Oct 8, 2026");
  await dialog.getByRole("checkbox", { name: "Reuse Barbell Back Squat set 1", exact: true }).uncheck();
  await dialog.getByRole("spinbutton", { name: "Barbell Back Squat previous set 2 weight", exact: true }).fill("60");
  await dialog.getByRole("spinbutton", { name: "Barbell Back Squat previous set 2 reps", exact: true }).fill("12");
  await dialog.getByRole("spinbutton", { name: "Barbell Back Squat previous set 2 RPE", exact: true }).fill("9");
  await dialog.getByRole("combobox", { name: "Barbell Back Squat previous set 2 type", exact: true }).selectOption("failure");
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: "/private/tmp/kemtech-reuse-popup.png" });
  await dialog.getByRole("button", { name: "Use checked sets", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".logger-set")).toHaveCount(1);
  await expect(page.getByLabel("Set 1 weight", { exact: true })).toHaveValue("60");
  await expect(page.getByLabel("Set 1 repetitions", { exact: true })).toHaveValue("12");
  await expect(page.getByRole("textbox", { name: /^Equipment/ })).toHaveValue("Smith Machine");
  await page.getByRole("button", { name: "Finish", exact: true }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/workouts$/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kemtech-preview-workouts-v1")!));
  expect(saved.find((workout: { id: string }) => workout.id === "source")).toEqual(source);
  expect(saved).toHaveLength(2);
  expect(saved[0].exercises[0].sets[0]).toMatchObject({ weight: 60, repetitions: 12, rpe: 9, type: "failure", setNumber: 1 });
  expect(saved[0].exercises[0].sets[0].id).not.toBe(source.exercises[0].sets[1].id);
});

test("reuse as is ignores preview edits, while Start fresh leaves an empty set", async ({ page }) => {
  await seed(page, [session("source", "2026-10-08")]);
  await page.goto("/dashboard/workouts/new");
  await page.getByRole("combobox", { name: /^Exercise / }).fill("Barbell Back Squat");
  const dialog = page.getByRole("dialog", { name: "Reuse a previous entry", exact: true });
  await dialog.getByRole("spinbutton", { name: "Barbell Back Squat previous set 1 weight", exact: true }).fill("99");
  await dialog.getByRole("checkbox", { name: "Reuse Barbell Back Squat set 2", exact: true }).uncheck();
  await dialog.getByRole("button", { name: "Reuse entry as is", exact: true }).click();
  await expect(page.getByLabel("Set 1 weight", { exact: true })).toHaveValue("50");
  await expect(page.getByLabel("Set 2 weight", { exact: true })).toHaveValue("55");
  await page.goto("/dashboard/workouts/new");
  await page.getByRole("combobox", { name: /^Exercise / }).fill("Barbell Back Squat");
  await dialog.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.getByLabel("Set 1 weight", { exact: true })).toHaveValue("");
  await expect(page.locator(".logger-set")).toHaveCount(1);
});

test("history starts with exercise details and blank sets, while explicit dated reuse copies sets", async ({ page }) => {
  const older = session("older", "2026-10-01", 40);
  const newer = session("newer", "2026-10-08", 50);
  await seed(page, [older, newer]);
  await page.goto("/dashboard/workouts/exercise/barbell%20back%20squat");
  await page.getByRole("button", { name: "Log workout", exact: true }).click();
  await expect(page.getByRole("combobox", { name: /^Exercise / })).toHaveValue("Barbell Back Squat");
  await expect(page.getByLabel("Set 1 weight", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Set 1 repetitions", { exact: true })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: /^Equipment/ })).toHaveValue("Smith Machine");
  await expect(page.getByRole("combobox", { name: /^Muscle group/ })).toHaveValue("Quadriceps");
  await expect(page.locator(".logger-set")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/dashboard/workouts/exercise/barbell%20back%20squat");
  await page.locator(".exercise-log").nth(1).getByRole("button", { name: "Reuse as new workout", exact: true }).click();
  await expect(page.getByLabel("Set 1 weight", { exact: true })).toHaveValue("40");
  await page.getByLabel("Set 1 repetitions", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Finish", exact: true }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/workouts$/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kemtech-preview-workouts-v1")!));
  expect(saved.find((workout: { id: string }) => workout.id === "older")).toEqual(older);
  expect(saved.find((workout: { id: string }) => workout.id === "newer")).toEqual(newer);
});

test("five previous sets fit in compact single rows on mobile without scrolling", async ({ page }) => {
  const source = session("five-sets", "2026-10-08");
  source.exercises[0].sets = Array.from({ length: 5 }, (_, index) => ({ ...source.exercises[0].sets[0], id: `compact-${index}`, setNumber: index + 1 }));
  await seed(page, [source]);
  await page.goto("/dashboard/workouts/new");
  await page.getByRole("combobox", { name: /^Exercise / }).fill("Barbell Back Squat");
  const dialog = page.getByRole("dialog", { name: "Reuse a previous entry", exact: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 700 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await expect(dialog.locator(".reuse-set")).toHaveCount(5);
    const layout = await dialog.evaluate((element) => {
      const rows = Array.from(element.querySelectorAll(".reuse-set"));
      return {
        scrolls: element.scrollHeight > element.clientHeight + 1,
        overflows: element.scrollWidth > element.clientWidth + 1,
        aligned: rows.every((row) => {
          const fields = Array.from(row.querySelectorAll(".input")).map((input) => input.getBoundingClientRect());
          return fields.length === 4 && fields.every((rect) => Math.abs(rect.top - fields[0].top) < 1 && rect.height >= 44);
        }),
      };
    });
    expect(layout, `Reuse layout at ${viewport.width}×${viewport.height}`).toEqual({ scrolls: false, overflows: false, aligned: true });
    await dialog.getByRole("button", { name: "Use checked sets", exact: true }).click({ trial: true });
    if (viewport.width === 390) await page.screenshot({ path: "/private/tmp/kemtech-compact-five-sets.png" });
  }
});

test("long previous logs remain scrollable with reuse actions reachable", async ({ page }) => {
  const source = session("long-log", "2026-10-08");
  source.exercises[0].sets = Array.from({ length: 20 }, (_, index) => ({ ...source.exercises[0].sets[0], id: `long-${index}`, setNumber: index + 1 }));
  await seed(page, [source]);
  await page.goto("/dashboard/workouts/new");
  await page.getByRole("combobox", { name: /^Exercise / }).fill("Barbell Back Squat");
  const dialog = page.getByRole("dialog", { name: "Reuse a previous entry", exact: true });
  await expect(dialog.locator(".reuse-set")).toHaveCount(20);
  expect(await dialog.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await dialog.getByRole("spinbutton", { name: "Barbell Back Squat previous set 20 reps", exact: true }).fill("15");
  await dialog.getByRole("button", { name: "Use checked sets", exact: true }).click();
  await expect(page.locator(".logger-set")).toHaveCount(20);
  await expect(page.getByLabel("Set 20 repetitions", { exact: true })).toHaveValue("15");
});

test("selected dashboard date changes suggested weekday, source logs and preview date", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
  const older = session("older-thursday", "2026-10-01", 40);
  const newer = session("newer-thursday", "2026-10-08", 60);
  const friday = session("friday", "2026-10-09", 30);
  friday.exercises[0].name = "Dumbbell Shoulder Press";
  friday.exercises[0].muscleGroup = "Shoulders";
  await seed(page, [older, newer, friday]);
  await page.goto("/dashboard");
  const card = page.getByRole("region", { name: "Suggested workout plan", exact: true });
  await expect(card).toContainText("2 past Thursday training days");
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await expect(card).toContainText("Friday’s Suggested Workout Plan");
  await expect(card).toContainText("October 16, 2026");
  await expect(card).toContainText("1 past Friday training day");
  await card.getByRole("button").click();
  await expect(page).toHaveURL(/plan=2026-10-16/);
  const fridayDialog = page.getByRole("dialog", { name: "Friday’s Suggested Workout Plan", exact: true });
  await expect(fridayDialog).toContainText("Friday, Oct 16, 2026");
  await expect(fridayDialog.getByRole("heading", { name: "Dumbbell Shoulder Press", exact: true })).toBeVisible();
  await expect(fridayDialog.getByRole("heading", { name: "Barbell Back Squat", exact: true })).toHaveCount(0);
  await fridayDialog.getByRole("button", { name: "Cancel plan", exact: true }).click();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Choose training date", exact: true }).click();
  await page.getByRole("dialog", { name: "Choose training date", exact: true }).getByRole("button", { name: "Thursday, October 8, 2026", exact: true }).click();
  await expect(card).toContainText("October 8, 2026");
  await expect(card).toContainText("1 past Thursday training day");
  await card.getByRole("button").click();
  const thursdayDialog = page.getByRole("dialog", { name: "Thursday’s Suggested Workout Plan", exact: true });
  // No peeking at the selected day's or later logs: only the Oct 1 session is reused.
  await expect(thursdayDialog.getByRole("spinbutton", { name: "Barbell Back Squat previous set 1 weight", exact: true })).toHaveValue("40");
  await expect(thursdayDialog).toContainText("Thursday, Oct 8, 2026");
  await thursdayDialog.getByRole("button", { name: "Cancel plan", exact: true }).click();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await expect(card).toContainText("No earlier Saturday training pattern");
  await expect(card.getByRole("button")).toHaveCount(0);
});

test("reuse respects entry units and validates empty selections without changing history", async ({ page }) => {
  const source = session("source", "2026-10-08");
  await seed(page, [source]);
  await page.goto("/dashboard/workouts/new");
  await page.getByRole("combobox", { name: "Weight entry unit", exact: true }).selectOption("kg");
  await page.getByRole("combobox", { name: /^Exercise / }).fill("Barbell Back Squat");
  const dialog = page.getByRole("dialog", { name: "Reuse a previous entry", exact: true });
  expect(Number(await dialog.getByRole("spinbutton", { name: "Barbell Back Squat previous set 1 weight", exact: true }).inputValue())).toBeCloseTo(22.6796, 3);
  await dialog.getByRole("checkbox", { name: "Reuse Barbell Back Squat set 1", exact: true }).uncheck();
  await dialog.getByRole("checkbox", { name: "Reuse Barbell Back Squat set 2", exact: true }).uncheck();
  await dialog.getByRole("button", { name: "Use checked sets", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Check at least one set to reuse.");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kemtech-preview-workouts-v1")!));
  expect(saved).toEqual([source]);
});

test("weekday suggested plan previews all exercises and supports choosing and editing sets", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
  const older = session("older", "2026-10-01", 40, true);
  const newer = session("newer", "2026-10-08", 50, true);
  await seed(page, [older, newer]);
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: /Today’s Suggested Workout Plan/ })).toBeVisible();
  await page.screenshot({ path: "/private/tmp/kemtech-suggested-plan-dashboard.png", fullPage: true });
  const openPlan = () => page.getByRole("button", { name: /Today’s Suggested Workout Plan/ }).click();
  await openPlan();
  const dialog = page.getByRole("dialog", { name: "Today’s Suggested Workout Plan", exact: true });
  await expect(dialog).toContainText("2 previous Thursday training days");
  await expect(dialog.getByRole("checkbox", { name: /^Include / })).toHaveCount(2);
  await page.screenshot({ path: "/private/tmp/kemtech-plan-preview.png" });
  await dialog.getByRole("checkbox", { name: "Include Barbell Bench Press", exact: true }).uncheck();
  await dialog.getByRole("checkbox", { name: "Reuse Barbell Back Squat set 2", exact: true }).uncheck();
  await dialog.getByRole("spinbutton", { name: "Barbell Back Squat previous set 1 weight", exact: true }).fill("65");
  await dialog.getByRole("button", { name: "Use checked sets", exact: true }).click();
  await expect(page.getByRole("combobox", { name: /^Exercise / })).toHaveValue("Barbell Back Squat");
  await expect(page.locator(".logger-exercise")).toHaveCount(1);
  await expect(page.getByLabel("Set 1 weight", { exact: true })).toHaveValue("65");
  await expect(page.getByRole("button", { name: "Mark set 1 complete", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Mark set 1 complete", exact: true }).click();
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/workouts$/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kemtech-preview-workouts-v1")!));
  expect(saved.find((workout: { id: string }) => workout.id === "newer")).toEqual(newer);
  expect(saved[0].exercises).toHaveLength(1);
  await page.getByRole("navigation", { name: "Account navigation" }).getByRole("link", { name: "Dashboard", exact: true }).click();
  await openPlan();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel plan", exact: true }).click();
  await expect(page.getByRole("combobox", { name: /^Exercise / })).toHaveValue("");
  await page.getByRole("button", { name: "Discard", exact: true }).first().click();
  await openPlan();
  await dialog.getByRole("checkbox", { name: "Include Barbell Bench Press", exact: true }).uncheck();
  await dialog.getByRole("spinbutton", { name: "Barbell Back Squat previous set 1 weight", exact: true }).fill("99");
  await dialog.getByRole("button", { name: "Use entire plan as is", exact: true }).click();
  await expect(page.locator(".logger-exercise")).toHaveCount(2);
  const squat = page.locator(".logger-exercise").filter({ has: page.locator('input[role="combobox"][value="Barbell Back Squat"]') });
  await expect(squat.getByLabel("Set 1 weight", { exact: true })).toHaveValue("50");
  await expect(page.locator(".logger-set")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Mark set 1 complete", exact: true }).first()).toHaveAttribute("aria-pressed", "false");
  page.once("dialog", (confirmation) => confirmation.accept());
  await page.getByRole("button", { name: "Discard", exact: true }).first().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kemtech-preview-workouts-v1")!).length)).toBe(3);
});
