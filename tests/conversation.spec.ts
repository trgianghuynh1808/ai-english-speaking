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

async function mockAnalyzeRoute(page: Page, status: number, body: unknown) {
  await page.route("**/api/analyze", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    }),
  );
}

async function recordAboutTwoSeconds(page: Page) {
  await page.getByTestId("record-button").click();
  await expect(page.getByTestId("record-timer")).toBeVisible();
  await page.waitForTimeout(2000);
  await page.getByTestId("record-button").click();
}

test("T1: record 2s then feedback card and new scaffolding appear", async ({
  page,
}) => {
  await mockAnalyzeRoute(page, 200, mockAnalysis);

  await page.goto("/");
  const hints = page.getByTestId("scaffolding-box");
  await expect(hints).toHaveCount(1);
  await expect(hints).toContainText("Check email or messages");

  await recordAboutTwoSeconds(page);

  const feedback = page.getByTestId("feedback-card");
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText("working from home");
  // The single panel box now carries the newest bot turn's hints.
  await expect(hints).toHaveCount(1);
  await expect(hints).toContainText("No commute");
});

test("T2: new scaffolding is blurred until revealed or 5s pass", async ({
  page,
}) => {
  await mockAnalyzeRoute(page, 200, mockAnalysis);

  await page.goto("/");
  const openerBox = page.getByTestId("scaffolding-box");
  await expect(openerBox.locator(".scaffolding-content")).toHaveCSS(
    "filter",
    "blur(6px)",
  );

  // The opener box is never clicked: it must clear by itself after 5s.
  await expect(openerBox.locator(".scaffolding-content")).toHaveCSS(
    "filter",
    "none",
    { timeout: 8000 },
  );

  await recordAboutTwoSeconds(page);

  // The panel remounts hints for the newest bot turn with a fresh 5s countdown.
  const newBox = page.getByTestId("scaffolding-box");
  await expect(newBox).toBeVisible();
  await expect(newBox.locator(".scaffolding-content")).toHaveCSS(
    "filter",
    "blur(6px)",
  );

  await newBox.getByTestId("reveal-button").click();
  await expect(newBox.locator(".scaffolding-content")).toHaveCSS(
    "filter",
    "none",
  );
});

test("T3: 429 response shows friendly notice and locks the recorder", async ({
  page,
}) => {
  await mockAnalyzeRoute(page, 429, { error: "rate_limited" });

  await page.goto("/");
  await recordAboutTwoSeconds(page);

  const status = page.getByTestId("status-message");
  await expect(status).toBeVisible();
  await expect(status).toContainText("Bạn nói nhanh quá");
  await expect(page.getByTestId("record-button")).toBeDisabled();
});
