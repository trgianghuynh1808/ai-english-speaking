# AGENTS.md

Guidelines for coding agents working in this repo.
<!-- Generate the project-specific sections with prompts/generate-agents-md.md, then review them by hand.
     Keep the "Testing Rules", "Verify Phase" and "Workflow Rules" sections: the scripts depend on them. -->

## Project Overview

Web-based English speaking practice app for an advanced reader/listener (80% passive comprehension) who struggles with speaking (blanking out, word retrieval) and pronunciation. Stack: Next.js (App Router), Tailwind CSS, Lucide icons, Gemini multimodal API. Full spec and JSON schema: see `BLUEPRINT.md` (read it before any feature work).

Hard constraints (from the blueprint):
- NEVER use browser speech recognition or text-only STT. Record raw audio with `MediaRecorder` (.webm) and send the blob straight to Gemini so mispronunciations are not auto-corrected by context.
- The audio prompt must make the model transcribe what was actually heard (no context-based correction) and flag mispronounced words / missing ending sounds.
- Bot never scolds; mixed Vietnamese-English input is recast into natural English. At most 1-2 corrections per turn.
- Every bot turn includes hidden scaffolding (2-3 ideas + sentence starters), blurred for 5s by default with a reveal button.

## Architecture

Browser (MediaRecorder -> audio blob + conversation history) -> Next.js API route (multipart form) -> Gemini API (strict phonetic prompt, JSON output) -> frontend renders raw transcript, pronunciation warnings, better expression, then speaks the bot reply via `window.speechSynthesis` and shows next scaffolding. Dev server on port 3000. Conversation state lives in the client; the API is stateless.

## Codebase Map

Project is new; structure will be added as code lands. Planned: `app/` (pages + `api/analyze/route.ts`), `components/` (Recorder, FeedbackCard, ScaffoldingBox), `lib/` (gemini client, system prompt, JSON schema types). Response schema: `BLUEPRINT.md` section 4. Secrets go in `.env.local`, never committed. Env vars: `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-3.8-flash`; never hardcode the model name in code).

## Commands

```bash
npm install
npm run dev          # dev server
npx tsc --noEmit     # type check
npx playwright test  # e2e tests
```

## Code Conventions

TypeScript strict, functional React components, Tailwind for styling. Code identifiers and comments in English. UI copy can be English; coaching hints may include Vietnamese.

## Testing Rules

- After each coding step, run the type/lint check and only the test command named in that step (see Commands). Do not run the whole suite per step, and do not design or add tests the plan does not ask for. If there are no specs yet, rely on the type check and note it in the task file.
- When tests fail, read `test-results/results.json` first (the Playwright JSON reporter writes it).
- In "Test status", report every test case from the task file (T1, T2...) as PASS / FAIL / not written yet, not just an overall result.
- When a plan step writes a spec, tick the matching test case in "Test cases" once the spec exists.
- Only use `playwright-cli` (interactive browser tool, separate from `@playwright/test`) when a failure is visual and `results.json` is not enough, or during the Verify phase.
- After any browser testing, clean up: close the browser and stop any dev server you started.
- Use unique test data per run (e.g. usernames like `user-${Date.now()}`) so runs do not collide.
- Tests must never touch production data.
- Test hook: none yet. Mock the Gemini API route in tests (never call the real API from e2e); microphone can be faked with Chromium flags `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`.

## Verify Phase

- After all plan steps are done, a Verify agent checks the feature in a real browser with `playwright-cli`, at the level set by the task file's `Verify mode:` line (`none` / `light` / `full`).
- `light`: run the suite once, open the browser only for test cases a spec cannot check (visual/layout), no new scenarios; write a spec only to reproduce a bug found.
- `full`: also try up to 2 important edge scenarios and add specs for unchecked scenarios (max 3 new tests).
- Results go in the task file's "## Verify" section with screenshot paths.
- The Verify agent must not change app code. Its last line in "## Verify" is exactly `VERIFY: PASS` or `VERIFY: FAIL`.

## Workflow Rules

- Every task has a file in `.agents/tasks/` (template: `_TEMPLATE.md`). Read it before starting work.
- Only modify files named in the task's plan. If another file must change, record the reason in the task file.
- Commit after each step with a clear message.
- Before finishing: tick the plan checkboxes and update "Trạng thái hiện tại" and "Test status" in the task file.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
