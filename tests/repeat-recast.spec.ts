import { expect, test, type Page } from "@playwright/test";

const mockAnalysis = {
  user_analysis: {
    raw_transcript: "I think working from home help me save time.",
    pronunciation_warnings: [
      {
        heard: "workin",
        intended: "working",
        tip: "Finish the -ing ending with a clear /ng/ sound.",
      },
    ],
    better_expression: "I think working from home helps me save time.",
  },
  bot_reply: {
    text: "That makes sense. What is the biggest time saver for you?",
    hidden_scaffolding: {
      ideas: ["No commute", "Flexible breaks"],
      sentence_starters: [
        "The biggest time saver for me is...",
        "I save time because I...",
      ],
    },
  },
};

async function mockAnalyzeRoute(page: Page, bodies: string[]): Promise<void> {
  await page.route("**/api/analyze", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockAnalysis),
    });
  });
}

async function recordAboutTwoSeconds(page: Page) {
  await page.getByTestId("record-button").click();
  await expect(page.getByTestId("record-timer")).toBeVisible();
  await page.waitForTimeout(2000);
  await page.getByTestId("record-button").click();
}

test("T1: repeat flow sends the model sentence as target", async ({ page }) => {
  const bodies: string[] = [];
  await mockAnalyzeRoute(page, bodies);

  await page.goto("/");
  await recordAboutTwoSeconds(page);
  await expect(page.getByTestId("feedback-card")).toBeVisible();

  await page.getByTestId("repeat-button").click();
  const banner = page.getByTestId("repeat-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(
    mockAnalysis.user_analysis.better_expression,
  );

  await recordAboutTwoSeconds(page);

  await expect(page.getByTestId("repeat-banner")).toHaveCount(0);
  expect(bodies).toHaveLength(2);
  const repeatBody = bodies[1];
  expect(repeatBody).toContain('name="target"');
  expect(repeatBody).toContain(mockAnalysis.user_analysis.better_expression);
  await expect(page.getByText("Repeat attempt")).toBeVisible();
});

test("T2: recording auto-stops after 60 fake-seconds and is sent", async ({
  page,
}) => {
  const bodies: string[] = [];
  await mockAnalyzeRoute(page, bodies);

  await page.clock.install({ time: Date.now() });
  await page.goto("/");

  await page.getByTestId("record-button").click();
  await expect(page.getByTestId("record-timer")).toBeVisible();

  await page.clock.fastForward(61_000);

  await expect(page.getByTestId("feedback-card")).toBeVisible();
  expect(bodies).toHaveLength(1);
});

test("T3: target longer than 300 chars returns 400, valid target 200", async ({
  request,
}) => {
  const audioFile = {
    name: "audio.webm",
    mimeType: "audio/webm",
    buffer: Buffer.from("fake-webm-audio-bytes"),
  };

  const tooLong = await request.post("/api/analyze", {
    multipart: {
      audio: audioFile,
      history: "[]",
      target: "a".repeat(301),
    },
  });
  expect(tooLong.status()).toBe(400);
  const errorBody = (await tooLong.json()) as { error?: string };
  expect(errorBody.error).toBe("'target' is too long");

  const valid = await request.post("/api/analyze", {
    multipart: {
      audio: audioFile,
      history: "[]",
      target: "I think working from home helps me save time.",
    },
  });
  expect(valid.status()).toBe(200);
});
