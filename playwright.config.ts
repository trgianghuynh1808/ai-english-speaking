import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: { MOCK_GEMINI: "1" },
  },
  projects: [
    {
      name: "chromium",
      use: {
        baseURL: "http://localhost:3000",
        permissions: ["microphone"],
        launchOptions: {
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        },
      },
    },
  ],
});
