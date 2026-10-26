import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const key = "kemtech-preview-body-weights-v1";

test("body-weight tracker supports dates, both units, trends, edits, deletion and dashboard summary", async ({ page }) => {
  await page.goto("/dashboard");
  const card = page.getByRole("region", { name: "Latest body weight" });
  await expect(card.getByText("Log your first body weight")).toBeVisible();
  expect(await page.getByRole("region", { name: "Training summary" }).evaluate((node) => Boolean(node.nextElementSibling?.classList.contains("dashboard-body-weight")))).toBe(true);
  await card.getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Your weight, over time" })).toBeVisible();
  const weight = page.getByLabel("Body weight", { exact: true });
  const unit = page.getByLabel("Weight entry unit");
  const date = page.getByLabel("Measurement date");
  const add = async (value: string, measuredOn: string, entryUnit = "lb") => {
    await unit.selectOption(entryUnit); await weight.fill(value); await date.fill(measuredOn);
    await page.getByRole("button", { name: "Save weight", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Body weight recorded.");
  };
  await add("180", "2020-10-20");
  await expect(page.locator(".body-weight-history-entry")).toHaveCount(1);
  await expect(page.getByText("First entry · your baseline")).toBeVisible();
  await expect(page.getByRole("img", { name: /1 dated measurements/ })).toBeVisible();
  await add("182", "2020-10-21");
  await add("182", "2020-10-22");
  await add("180", "2020-10-23");
  const entries = page.locator(".body-weight-history-entry");
  await expect(entries).toHaveCount(4);
  await expect(entries.nth(0)).toContainText("Decreased");
  await expect(entries.nth(1)).toContainText("Same as previous entry");
  await expect(entries.nth(2)).toContainText("Increased");
  await expect(entries.nth(0)).toContainText("81.6 kg");
  // Unit toggles preserve canonical precision even when the visible value is rounded.
  await weight.fill("180");
  await unit.selectOption("kg"); await expect(weight).toHaveValue("81.65");
  await unit.selectOption("lb"); await expect(weight).toHaveValue("180");
  await date.fill("2020-10-19");
  await page.getByRole("button", { name: "Save weight", exact: true }).click();
  await expect(entries).toHaveCount(5);
  const stored = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key);
  expect(stored.find((entry: { measuredOn: string }) => entry.measuredOn === "2020-10-19").weightKg).toBeCloseTo(81.6466266, 5);
  await add("80", "2020-10-24", "kg");
  await expect(entries).toHaveCount(6);
  await expect(entries.first()).toContainText("80 kg");
  await weight.fill("81"); await date.fill("2020-10-24");
  await page.getByRole("button", { name: "Save weight", exact: true }).click();
  await expect(page.locator(".body-weight-page [role=alert]")).toContainText("already exists");
  await page.getByRole("button", { name: "Edit body weight for 2020-10-24" }).click();
  await expect(weight).toHaveValue("80"); await weight.fill("82");
  await page.getByRole("button", { name: "Update weight" }).click();
  await expect(page.getByRole("status")).toHaveText("Body-weight entry updated.");
  await expect(entries.first()).toContainText("Increased");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete body weight for 2020-10-24" }).click();
  await expect(entries).toHaveCount(5);
  await page.reload(); await expect(entries).toHaveCount(5);
  await expect(page.locator(".recharts-line-dots circle")).toHaveCount(5);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({ path: "/private/tmp/kemtech-body-weight-mobile.png", fullPage: true });
  await page.screenshot({ path: "/private/tmp/kemtech-body-weight-preview.png" });
  await page.locator(".body-weight-chart-card").evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 82, behavior: "instant" }));
  await page.screenshot({ path: "/private/tmp/kemtech-body-weight-chart-preview.png" });
  await page.locator(".body-weight-back").click();
  await expect(card).toContainText("Last recorded Oct 23, 2020");
  await expect(card).toContainText("180 lb"); await expect(card).toContainText("81.6 kg");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "/private/tmp/kemtech-body-weight-dashboard.png", fullPage: true });
});

test("profile kg preference controls the dashboard and tracker primary display", async ({ page }) => {
  // Set the preference through the same UI used by account profiles.
  await page.goto("/dashboard/settings");
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
  await page.getByRole("combobox", { name: "Weight unit", exact: true }).selectOption("kg");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Preferences saved.");
  await page.goto("/dashboard/body-weight");
  await expect(page.getByLabel("Weight entry unit")).toHaveValue("kg");
  await page.getByLabel("Body weight", { exact: true }).fill("80");
  await page.getByLabel("Measurement date").fill("2020-10-20");
  await page.getByRole("button", { name: "Save weight", exact: true }).click();
  await expect(page.locator(".body-weight-history-entry")).toContainText("176.4 lb");
  await page.goto("/dashboard");
  await expect(page.locator(".body-weight-card .dual-weight > span")).toHaveText("80 kg");
});
