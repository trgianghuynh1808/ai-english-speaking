# Task: scaffold-nextjs

Verify mode: light

## Mục tiêu
Có project Next.js (App Router) chạy được với Tailwind, type cho JSON schema của app và một Playwright smoke test. Chưa làm tính năng nào khác.

## Quyết định đã chốt
- Next.js App Router + TypeScript + Tailwind + lucide-react, không dùng `src/`.
- Model Gemini đọc từ biến môi trường `GEMINI_MODEL`, mặc định `gemini-3.8-flash`. Không gắn cứng trong code.
- Playwright dùng Chromium với mic giả; không gọi Gemini thật trong test.
- Không đụng tới `AGENTS.md`, `CLAUDE.md`, `BLUEPRINT.md`, `scripts/`, `.agents/` (ngoài file task này).

## Ngữ cảnh
- Thư mục hiện có file của kit; `create-next-app` có thể báo xung đột, nếu vậy tạo vào thư mục tạm rồi chép sang, giữ nguyên các file trên.
- `.gitignore` đã có các dòng của kit (`.agents/queue/`, `.agents/status/`, `.agents/run.log`, `test-results/`, `playwright-report/`, `.env*.local`): phải giữ khi merge với `.gitignore` của Next.js.
- `.env.local` đã tồn tại (chứa key thật): KHÔNG đọc, KHÔNG sửa, KHÔNG commit.
- Schema (BLUEPRINT.md mục 4):
```ts
export interface PronunciationWarning { heard: string; intended: string; tip: string }
export interface AnalyzeResponse {
  user_analysis: { raw_transcript: string; pronunciation_warnings: PronunciationWarning[]; better_expression: string };
  bot_reply: { text: string; hidden_scaffolding: { ideas: string[]; sentence_starters: string[] } };
}
export interface HistoryTurn { role: "user" | "bot"; text: string }
```
- Mẫu cấu hình Playwright: `examples/playwright.config.ts` (nếu có trong repo thì tham khảo; không thì tự viết theo mô tả ở bước 3).

## Plan
- [x] 1. [vừa] `package.json` → chạy `npx create-next-app@latest` với `--ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm`, rồi `npm i lucide-react`. Giữ nguyên file của kit; merge `.gitignore` giữ mọi dòng cũ. Chạy `npm run build` hoặc `npx tsc --noEmit` để kiểm tra.
- [x] 2. [dễ] `lib/types.ts` → export `PronunciationWarning`, `AnalyzeResponse`, `HistoryTurn` đúng như snippet ở Ngữ cảnh.
- [x] 3. [vừa] `playwright.config.ts` → `npm i -D @playwright/test`; cấu hình: testDir `tests`, reporter có JSON ghi `test-results/results.json`, `webServer: npm run dev` cổng 3000, project Chromium với `launchOptions.args` `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` và `permissions: ["microphone"]`. Thêm script `"typecheck": "tsc --noEmit"` vào `package.json`; tạo `.env.example` gồm `GEMINI_API_KEY=` và `GEMINI_MODEL=gemini-3.8-flash`.
- [x] 4. [dễ] `app/page.tsx` → trang chủ tối giản: tiêu đề "AI English Speaking Coach" có `data-testid="app-title"` và một khung trống `data-testid="conversation"`. Dọn `app/globals.css` về Tailwind cơ bản.
- [x] 5. [dễ] `tests/smoke.spec.ts` → viết T1; chạy `npx playwright test tests/smoke.spec.ts -g "T1"` (cài trình duyệt bằng `npx playwright install chromium` nếu thiếu) và `npm run typecheck`.

## Test cases
- [x] T1. Home loads — mở `/` và thấy `app-title` cùng `conversation` — tests/smoke.spec.ts

## Trạng thái hiện tại
Tất cả bước 1–5 xong. Bước 1: scaffold Next.js 16.4.6 (App Router, TS, Tailwind v4, ESLint) qua thư mục tạm, giữ file kit, cài lucide-react, merge `.gitignore` giữ đủ dòng cũ, đổi name package thành `ai-english-speaking`. Bước 2: `lib/types.ts` đúng snippet. Bước 3: cài `@playwright/test`, `playwright.config.ts` (testDir `tests`, JSON reporter ra `test-results/results.json`, webServer `npm run dev` cổng 3000, project chromium mic giả + `permissions: ["microphone"]`), script `typecheck`, `.env.example` (commit bằng `git add -f` vì dòng `.env*`). Bước 4: `app/page.tsx` tối giản với `app-title` (h1 "AI English Speaking Coach") + khung trống `conversation`; `app/globals.css` chỉ còn `@import "tailwindcss";`. Bước 5: viết `tests/smoke.spec.ts` (T1) và chạy pass. Sửa ngoài plan (lý do ghi nhận): thêm `baseURL: "http://localhost:3000"` vào `playwright.config.ts` vì lần chạy T1 đầu lỗi "Cannot navigate to invalid URL" khi `page.goto("/")` không có baseURL. `npm run typecheck` pass sau bước 5. Chưa làm Verify phase (để Verify agent).

## Test status
- Lần chạy cuối: `npx playwright test tests/smoke.spec.ts -g "T1"` → 1 passed (2.3s); `npm run typecheck` pass (sau bước 5). Dev server của Playwright đã dừng, port 3000 trống.
- Kết quả từng test:
  - T1: PASS
- Fail chi tiết: không có.

## Verify
- Verify mode `light`: T1 là kiểm tra DOM, không cần screenshot.
- `npx playwright test` (toàn bộ suite): 1 passed. T1 PASS.
- `npm run typecheck`: PASS. `npm run lint`: PASS.
- `.env.local` không nằm trong git (`git ls-files` = 0).
- Ghi chú: `next dev` tự thêm khối `nextjs-agent-rules` vào `AGENTS.md`, giữ lại.
- Non-blocking: `.gitignore` có `.env*` nên `.env.example` phải `git add -f`; nên thêm `!.env.example`.

VERIFY: PASS

## Đã thử mà không được
-

## Số liệu
- Quota Claude:
- Quota Go:
- Số lần tự sửa:
- Model dùng:
