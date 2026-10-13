import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("app metadata provides a standalone launch and branded Home Screen icons", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest).toMatchObject({ display: "standalone", start_url: "/dashboard", scope: "/", short_name: "Kemtech" });
  await page.goto("/dashboard/settings");
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/kemtech-180.png");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
  for (const size of [180, 192, 512]) {
    const dimensions = await page.evaluate(async (size) => {
      const image = new Image();
      image.src = `/icons/kemtech-${size}.png`;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, size);
    expect(dimensions).toEqual({ width: size, height: size });
  }
});

test("iPhone installation instructions explain the Home Screen launch", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "userAgent", { configurable: true, value: "iPhone" }));
  await page.goto("/dashboard/settings");
  await expect(page.getByRole("heading", { name: "Use Kemtech as an app" })).toBeVisible();
  await expect(page.getByText("Turn on Open as Web App if shown, then tap Add.")).toBeVisible();
});

test("installed app pull-to-refresh preserves an unsaved workout and uses the shorter buttons", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { configurable: true, value: true }));
  await page.goto("/dashboard/workouts/new");
  await expect(page.locator("html")).toHaveClass(/standalone-app/);
  await page.getByRole("combobox", { name: /^Exercise / }).fill("Barbell Back Squat");
  await page.getByLabel("Set 1 weight", { exact: true }).fill("65");
  await page.getByLabel("Set 1 repetitions").fill("8");
  await expect(page.getByRole("button", { name: "Discard", exact: true }).first()).toHaveCSS("background-color", "rgb(239, 244, 255)");
  await expect(page.getByRole("button", { name: "Finish", exact: true }).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => {
    window.addEventListener("kemtech-app-refresh", () => document.documentElement.dataset.refreshed = "yes", { once: true });
    const target = document.querySelector("h1")!;
    const touch = (y: number) => new Touch({ identifier: 1, target, clientX: 180, clientY: y });
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(100)] }));
    target.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, cancelable: true, touches: [touch(250)] }));
  });
  await expect(page.getByRole("status")).toHaveText("Release to refresh");
  await page.evaluate(() => document.querySelector("h1")!.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [] })));
  await expect(page.locator("html")).toHaveAttribute("data-refreshed", "yes");
  await expect(page.getByLabel("Set 1 weight", { exact: true })).toHaveValue("65");
  await expect(page.getByLabel("Set 1 repetitions")).toHaveValue("8");
  await expect(page).toHaveURL(/\/dashboard\/workouts\/new$/);
  await page.goto("/dashboard/settings");
  await expect(page.getByRole("heading", { name: "Use Kemtech as an app" })).toHaveCount(0);
});
