import { expect, test, type Page } from "@playwright/test";

const firstAnalysis = {
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

const secondAnalysis = {
  user_analysis: {
    raw_transcript: "The biggest time saver for me is skipping my morning commute.",
    pronunciation_warnings: [
      {
        heard: "commut",
        intended: "commute",
        tip: "Keep the final /t/ crisp so it does not blend into the next word.",
      },
    ],
    better_expression: "The biggest time saver for me is skipping my morning commute.",
  },
  bot_reply: {
    text: "Nice. What would you do with the time you save every day?",
    hidden_scaffolding: {
      ideas: ["Sleep in a little", "Read before work"],
      sentence_starters: [
        "With the extra time, I would...",
        "I would probably...",
      ],
    },
  },
};

const thirdAnalysis = {
  user_analysis: {
    raw_transcript: "I usually start my day by checking my messages and calendar.",
    pronunciation_warnings: [],
    better_expression: "I usually start my day by checking my messages and calendar.",
  },
  bot_reply: {
    text: "Sounds organized. Do you reply to messages right away?",
    hidden_scaffolding: {
      ideas: ["Reply to urgent ones", "Batch the rest later"],
      sentence_starters: [
        "I reply right away to...",
        "I usually wait until...",
      ],
    },
  },
};

async function mockAnalyzeRouteInOrder(page: Page, bodies: unknown[]) {
  let call = 0;
  await page.route("**/api/analyze", async (route) => {
    const body = bodies[Math.min(call, bodies.length - 1)];
    call += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function recordAboutTwoSeconds(page: Page) {
  await page.getByTestId("record-button").click();
  await expect(page.getByTestId("record-timer")).toBeVisible();
  await page.waitForTimeout(2000);
  await page.getByTestId("record-button").click();
}

test("T1: after a turn, feedback and hints live in the coach panel, not the chat", async ({
  page,
}) => {
  await mockAnalyzeRouteInOrder(page, [firstAnalysis]);

  await page.goto("/");
  await recordAboutTwoSeconds(page);

  const conversation = page.getByTestId("conversation");
  await expect(conversation.getByTestId("feedback-card")).toHaveCount(0);
  await expect(conversation.getByTestId("scaffolding-box")).toHaveCount(0);

  const panel = page.getByTestId("coach-panel");
  await expect(panel.getByTestId("hints-section")).toHaveCount(1);
  await expect(panel.getByTestId("feedback-section")).toHaveCount(1);

  const feedback = page.getByTestId("feedback-card");
  await expect(feedback).toContainText(firstAnalysis.user_analysis.raw_transcript);
  const fixChip = feedback.locator("li").filter({ hasText: "workin" });
  await expect(fixChip).toContainText("working");
  await expect(feedback).toContainText(firstAnalysis.user_analysis.better_expression);
});

test("T2: an older user turn can be selected; the newest is re-selected on new turns", async ({
  page,
}) => {
  await mockAnalyzeRouteInOrder(
    page,
    [firstAnalysis, secondAnalysis, thirdAnalysis],
  );

  await page.goto("/");
  await recordAboutTwoSeconds(page);
  await recordAboutTwoSeconds(page);

  const turns = page.getByTestId("user-turn");
  await expect(turns).toHaveCount(2);
  const feedbackSection = page.getByTestId("feedback-section");
  await expect(feedbackSection).toContainText(
    secondAnalysis.user_analysis.raw_transcript,
  );

  await turns.first().click();
  await expect(feedbackSection).toContainText(
    firstAnalysis.user_analysis.raw_transcript,
  );
  await expect(turns.first()).toHaveAttribute("aria-pressed", "true");
  await expect(turns.nth(1)).toHaveAttribute("aria-pressed", "false");

  await recordAboutTwoSeconds(page);

  await expect(turns).toHaveCount(3);
  await expect(feedbackSection).toContainText(
    thirdAnalysis.user_analysis.raw_transcript,
  );
  await expect(turns.last()).toHaveAttribute("aria-pressed", "true");
  await expect(turns.first()).toHaveAttribute("aria-pressed", "false");
});
