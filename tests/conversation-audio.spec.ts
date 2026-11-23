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

async function mockAnalyzeRoute(page: Page) {
  await page.route("**/api/analyze", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockAnalysis),
    }),
  );
}

async function recordAboutTwoSeconds(page: Page) {
  await page.getByTestId("record-button").click();
  await expect(page.getByTestId("record-timer")).toBeVisible();
  await page.waitForTimeout(2000);
  await page.getByTestId("record-button").click();
}

async function spokenTexts(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __spoken: string[] }).__spoken,
  );
}

async function fakeSpeechAndAudio(page: Page) {
  await page.addInitScript(() => {
    const testWindow = window as unknown as {
      __spoken: string[];
      __audioSources: string[];
    };
    testWindow.__spoken = [];
    testWindow.__audioSources = [];

    const synthesis = window.speechSynthesis;
    synthesis.speak = (utterance: SpeechSynthesisUtterance) => {
      testWindow.__spoken.push(utterance.text);
      utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
    };
    synthesis.cancel = () => {};
    synthesis.getVoices = () => [];
    synthesis.addEventListener = () => {};
    synthesis.removeEventListener = () => {};

    const RealAudio = window.Audio;
    window.Audio = class extends RealAudio {
      constructor(src?: string) {
        super(src);
        testWindow.__audioSources.push(src ?? "");
      }
    };
  });
}

test.beforeEach(async ({ page }) => {
  // Init scripts run on every navigation, so only clear on the first page load.
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("e2e-cleared")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("e2e-cleared", "1");
    }
  });
});

test("T1: bot speaks after each turn until auto-speak is turned off", async ({
  page,
}) => {
  await fakeSpeechAndAudio(page);
  await mockAnalyzeRoute(page);

  await page.goto("/");
  const toggle = page.getByTestId("auto-speak-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await recordAboutTwoSeconds(page);
  await expect(page.getByTestId("feedback-card")).toHaveCount(1);

  await expect
    .poll(() => spokenTexts(page))
    .toEqual([mockAnalysis.bot_reply.text]);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await recordAboutTwoSeconds(page);
  await expect(page.getByTestId("user-turn")).toHaveCount(2);

  expect(await spokenTexts(page)).toEqual([mockAnalysis.bot_reply.text]);
});

test("T2: conversation survives reload and New conversation resets it", async ({
  page,
}) => {
  await fakeSpeechAndAudio(page);
  await mockAnalyzeRoute(page);

  await page.goto("/");
  await recordAboutTwoSeconds(page);
  await expect(page.getByTestId("feedback-card")).toHaveCount(1);

  await page.reload();

  await expect(page.getByTestId("feedback-card")).toHaveCount(1);
  await expect(page.getByTestId("scaffolding-box")).toHaveCount(1);

  const restoredBox = page.getByTestId("scaffolding-box").first();
  await expect(restoredBox.locator(".scaffolding-content")).toHaveCSS(
    "filter",
    "none",
  );
  await expect(restoredBox.getByTestId("reveal-button")).toHaveCount(0);

  await page.getByTestId("new-conversation").click();
  await expect(page.getByTestId("scaffolding-box")).toHaveCount(1);
  await expect(page.getByTestId("feedback-card")).toHaveCount(0);
  await expect(page.getByTestId("conversation")).toContainText(
    "Walk me through a normal workday",
  );
  await expect(page.getByTestId("play-recording")).toHaveCount(0);
});

test("T3: the user turn can replay its own recording", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await fakeSpeechAndAudio(page);
  await mockAnalyzeRoute(page);

  await page.goto("/");
  await recordAboutTwoSeconds(page);
  await expect(page.getByTestId("feedback-card")).toHaveCount(1);

  const playButton = page.getByTestId("play-recording");
  await expect(playButton).toHaveCount(1);
  await playButton.click();

  const sources = await page.evaluate(
    () => (window as unknown as { __audioSources: string[] }).__audioSources,
  );
  expect(sources).toHaveLength(1);
  expect(sources[0]).toMatch(/^blob:/);
  expect(pageErrors).toEqual([]);
});
