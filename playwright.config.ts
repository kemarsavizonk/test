import { defineConfig, devices } from "@playwright/test";

export default defineConfig({ testDir:"./e2e",fullyParallel:true,retries:process.env.CI?2:0,reporter:"html",use:{baseURL:"http://localhost:3001",trace:"on-first-retry"},webServer:{command:"./node_modules/.bin/next dev --webpack -p 3001",url:"http://localhost:3001",reuseExistingServer:!process.env.CI},projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}},{name:"mobile",use:{...devices["Pixel 7"]}}] });
