import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const workout = (id: string, weight: number, day: number) => ({
  id, title: "Incline Barbell Bench Press + Single-Leg Romanian Deadlift", status: "completed",
  performedAt: `2026-10-${day}T12:00:00.000Z`, completedAt: `2026-10-${day}T13:00:00.000Z`,
  createdAt: `2026-10-${day}T12:00:00.000Z`, updatedAt: `2026-10-${day}T13:00:00.000Z`,
  exercises: [{ id: `exercise-${id}`, name: "Barbell Back Squat", muscleGroup: "Quadriceps", equipment: "Barbell",
    sets: [{ id: `set-${id}`, setNumber: 1, weight, repetitions: 10, completed: true, type: "working" }] }],
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript((items) => {
    if (!localStorage.getItem("kemtech-preview-workouts-v1")) localStorage.setItem("kemtech-preview-workouts-v1", JSON.stringify(items));
  }, [workout("baseline", 50, 10), workout("personal-best", 55, 11)]);
});

test("mobile account screens fit the viewport, including populated history and reports", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/dashboard", "/dashboard/workouts/new", "/dashboard/workouts", "/dashboard/reports", "/dashboard/settings", "/dashboard/achievements", "/dashboard/exercises", "/dashboard/records"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const dimensions = await page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content, `${route} at ${width}px must not scroll horizontally`).toBeLessThanOrEqual(dimensions.width);
    }
  }
});

test("mobile exercise search narrows and a workout can be saved without sideways scrolling", async ({ page }) => {
  await page.goto("/dashboard/workouts/new");
  const search = page.getByRole("combobox", { name: /^Exercise / });
  await search.fill("squat");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(10);
  await search.fill("barbell back squat");
  await expect(page.getByRole("listbox")).toBeHidden();
  await page.getByLabel("Equipment", { exact: false }).fill("Smith Machine");
  await page.getByLabel("Set 1 weight", { exact: true }).fill("60");
  await page.getByLabel("Set 1 repetitions").fill("10");
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  await expect(page.getByLabel("Set 2 weight", { exact: true })).toHaveValue("60");
  await page.screenshot({ path: "/private/tmp/kemtech-mobile-logger.png", fullPage: true });
  await page.getByRole("button", { name: "Finish", exact: true }).last().click();
  await expect(page).toHaveURL(/\/dashboard\/workouts$/);
  await expect(page.getByRole("heading", { name: "Barbell Back Squat", exact: true })).toBeVisible();
});

test("unread achievements clear on opening, remain new for that visit, and stay read after returning", async ({ page }) => {
  await page.goto("/dashboard");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const mobileTab = page.getByRole("navigation", { name: "Account navigation" }).getByRole("link", { name: /Achievements/ });
  await expect(mobileTab.getByLabel("1 unread achievement", { exact: true })).toBeVisible();
  await mobileTab.click();
  await expect(page.getByRole("heading", { name: "1 new achievement!", exact: true })).toBeVisible();
  await expect(mobileTab.locator(".notification-badge")).toHaveCount(0);
  await page.getByRole("navigation", { name: "Account navigation" }).getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your training dashboard", exact: true })).toBeVisible();
  await mobileTab.click();
  await expect(page.getByRole("heading", { name: "Your training achievements", exact: true })).toBeVisible();
  await expect(page.locator(".achievement-new")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your training achievements", exact: true })).toBeVisible();
  await page.goto("/dashboard/workouts/new");
  await page.getByRole("combobox", { name: /^Exercise / }).fill("Barbell Back Squat");
  await page.getByLabel("Set 1 weight", { exact: true }).fill("60");
  await page.getByLabel("Set 1 repetitions").fill("10");
  await page.getByRole("button", { name: "Finish", exact: true }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/workouts$/);
  await expect(mobileTab.getByLabel("1 unread achievement", { exact: true })).toBeVisible();
  await mobileTab.click();
  await expect(page.getByRole("heading", { name: "1 new achievement!", exact: true })).toBeVisible();
  await expect(page.locator(".achievement-row")).toHaveCount(2);
  await expect(page.locator(".achievement-new")).toHaveCount(1);
  await page.screenshot({ path: "/private/tmp/kemtech-mobile-achievements.png", fullPage: true });
});
