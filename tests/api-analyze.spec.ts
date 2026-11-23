import { expect, test } from "@playwright/test";

const audioFile = {
  name: "audio.webm",
  mimeType: "audio/webm",
  buffer: Buffer.from("fake-webm-audio-bytes"),
};

test("T1: valid request returns 200 with analysis and scaffolding", async ({ request }) => {
  const response = await request.post("/api/analyze", {
    multipart: {
      audio: audioFile,
      history: JSON.stringify([
        { role: "bot", text: "Hi! What did you do today?" },
        { role: "user", text: "I worked from home." },
      ]),
    },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(typeof body.user_analysis.raw_transcript).toBe("string");
  expect(Array.isArray(body.user_analysis.pronunciation_warnings)).toBe(true);
  expect(typeof body.user_analysis.better_expression).toBe("string");
  expect(Array.isArray(body.bot_reply.hidden_scaffolding.ideas)).toBe(true);
  expect(Array.isArray(body.bot_reply.hidden_scaffolding.sentence_starters)).toBe(
    true,
  );
});

test("T2: missing audio or non-JSON history returns 400", async ({ request }) => {
  const missingAudio = await request.post("/api/analyze", {
    multipart: { history: "[]" },
  });
  expect(missingAudio.status()).toBe(400);

  const badHistory = await request.post("/api/analyze", {
    multipart: {
      audio: audioFile,
      history: "not-valid-json{{",
    },
  });
  expect(badHistory.status()).toBe(400);
});

test("T3: non-audio file returns 400", async ({ request }) => {
  const response = await request.post("/api/analyze", {
    multipart: {
      audio: {
        name: "notes.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("some text"),
      },
      history: "[]",
    },
  });
  expect(response.status()).toBe(400);
});
