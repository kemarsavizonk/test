import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("preferred name persists, personalizes achievements and falls back when cleared", async ({ page }) => {
  await page.goto("/dashboard/settings");
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();
  await page.getByRole("textbox", { name: "First name", exact: true }).fill("Kemar");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved.");
  const tabs = page.getByRole("navigation", { name: "Account navigation" });
  await tabs.getByRole("link", { name: "Achievements", exact: true }).click();
  await expect(page.getByText("Kemar’s achievements", { exact: true })).toBeVisible();
  await tabs.getByRole("link", { name: "Me", exact: true }).click();
  await page.getByRole("textbox", { name: /^Nickname/ }).fill("Keem");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved.");
  await page.reload();
  await expect(page.getByRole("textbox", { name: /^Nickname/ })).toHaveValue("Keem");
  await tabs.getByRole("link", { name: "Achievements", exact: true }).click();
  await expect(page.getByText("Keem’s achievements", { exact: true })).toBeVisible();
  await page.screenshot({ path: "/private/tmp/kemtech-preferred-name.png" });
  await tabs.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByText("Keem’s fitness, at a glance", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "KemTech Inc. dashboard", exact: true })).toBeVisible();
  await tabs.getByRole("link", { name: "Me", exact: true }).click();
  await page.getByRole("textbox", { name: /^Nickname/ }).fill("");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await tabs.getByRole("link", { name: "Achievements", exact: true }).click();
  await expect(page.getByText("Kemar’s achievements", { exact: true })).toBeVisible();
});
