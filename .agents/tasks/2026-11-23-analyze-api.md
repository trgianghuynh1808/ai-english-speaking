# Task: analyze-api

Verify mode: light

## Mục tiêu
`POST /api/analyze` nhận audio `.webm` cùng lịch sử hội thoại, gọi Gemini bằng prompt "nghe âm thô" và trả JSON đúng schema `AnalyzeResponse`. Test dùng mock, không gọi Gemini thật.

## Quyết định đã chốt
- SDK `@google/genai`; `responseMimeType: "application/json"`, `responseSchema` khớp `AnalyzeResponse`, `temperature: 0.2`.
- Model đọc từ `GEMINI_MODEL` (mặc định `gemini-3.8-flash`), key từ `GEMINI_API_KEY`. Không gắn cứng trong code.
- Khi `MOCK_GEMINI=1`, `lib/gemini.ts` trả fixture cố định, không gọi mạng. Chỉ Playwright webServer bật biến này.
- Giới hạn: audio tối đa 10 MB, `type` bắt đầu bằng `audio/`, chỉ lấy 6 lượt history gần nhất.
- Mọi kết quả Gemini đi qua `lib/validate.ts`; `pronunciation_warnings` cắt tối đa 2 mục.
- KHÔNG đọc, sửa hay commit `.env.local`. Không gọi Gemini thật trong test.

## Ngữ cảnh
- Next.js 16 khác bản cũ: đọc `node_modules/next/dist/docs/` về route handler (App Router) trước khi viết `route.ts`.
- `lib/types.ts` đã có `AnalyzeResponse`, `PronunciationWarning`, `HistoryTurn` (role `"user" | "bot"`).
- `playwright.config.ts` hiện có `webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI }` và project chromium với `baseURL`.
- Spec của prompt (BLUEPRINT.md mục 1–2): nghe âm thô, không auto-correct; `raw_transcript` ghi đúng cái nghe được kể cả từ sai; flag từ phát âm sai và âm cuối thiếu; tối đa 2 warning, chọn lỗi nghiêm trọng nhất; tiếng Việt xen vào thì dịch và recast trong `better_expression`; không bao giờ chê; `bot_reply.text` kết thúc bằng một câu hỏi cụ thể (không mở); `hidden_scaffolding` gồm 2–3 `ideas` và 2 `sentence_starters`; chỉ trả JSON.
- Lưu ý khi test: `MOCK_GEMINI` phải được đặt trong `webServer.env` để route handler nhìn thấy.

## Plan
- [x] 1. [khó] `lib/prompt.ts` → export `SYSTEM_PROMPT` (tiếng Anh, theo đúng spec ở Ngữ cảnh) và `buildUserPrompt(history: HistoryTurn[]): string` (chỉ 6 lượt cuối, định dạng "User:/Coach:").
- [x] 2. [dễ] `lib/validate.ts` → `parseAnalyzeResponse(raw: unknown): AnalyzeResponse`: throw `Error` khi thiếu field/sai kiểu; cắt `pronunciation_warnings` còn 2 mục; trim chuỗi.
- [x] 3. [vừa] `lib/gemini.ts` → `npm i @google/genai`; export `analyzeAudio({ audio: Buffer, mimeType: string, history: HistoryTurn[] }): Promise<AnalyzeResponse>`: audio gửi `inlineData` base64, `systemInstruction: SYSTEM_PROMPT`, `responseSchema` khớp types, nếu `MOCK_GEMINI === "1"` trả fixture không gọi mạng; luôn qua `parseAnalyzeResponse`.
- [x] 4. [vừa] `app/api/analyze/route.ts` → `POST` đọc `multipart/form-data`: `audio` (File) và `history` (chuỗi JSON, mặc định `[]`). Thiếu/sai kiểu audio hoặc history không phải JSON → 400; quá 10 MB → 413; lỗi Gemini/validate → 502 `{ error: "..." }` không lộ key hay stack; thành công → 200 với `AnalyzeResponse`.
- [x] 5. [vừa] `tests/api-analyze.spec.ts` → thêm `env: { MOCK_GEMINI: "1" }` vào `webServer` trong `playwright.config.ts`; viết T1–T3 bằng `request` fixture gửi multipart. Chạy `npx playwright test tests/api-analyze.spec.ts` và `npm run typecheck`.

## Test cases
- [x] T1. Valid request — gửi `.webm` nhỏ cùng history, trả 200 và đủ field `user_analysis` cùng `bot_reply.hidden_scaffolding` — tests/api-analyze.spec.ts
- [x] T2. Missing audio — không có `audio` hoặc `history` không phải JSON thì trả 400 — tests/api-analyze.spec.ts
- [x] T3. Non-audio file — gửi file `text/plain` thì trả 400 — tests/api-analyze.spec.ts

## Trạng thái hiện tại
Bước 1 hoàn thành: `lib/prompt.ts` export `SYSTEM_PROMPT` (nghe âm thô không auto-correct, tối đa 2 warnings nghiêm trọng nhất, recast Việt-Anh trong `better_expression`, không chê, `bot_reply.text` kết thúc bằng câu hỏi cụ thể, scaffolding 2-3 ideas + 2 sentence_starters, chỉ trả JSON) và `buildUserPrompt` (6 lượt cuối, định dạng "User:/Coach:").
Bước 2 hoàn thành: `lib/validate.ts` export `parseAnalyzeResponse` — throw `Error` khi thiếu field/sai kiểu (kể cả phần tử mảng không phải string), cắt `pronunciation_warnings` còn tối đa 2 mục (chỉ validate 2 mục đầu), trim mọi chuỗi.
Bước 3 hoàn thành: cài `@google/genai` 3.6.1; `lib/gemini.ts` export `analyzeAudio` — `MOCK_GEMINI=1` trả fixture qua `parseAnalyzeResponse` không gọi mạng; ngược lại gọi `generateContent` với `inlineData` base64, `systemInstruction: SYSTEM_PROMPT`, `responseMimeType: "application/json"`, `responseSchema` khớp `AnalyzeResponse`, `temperature: 0.2`; model lấy từ `GEMINI_MODEL` (mặc định `gemini-3.8-flash`), key từ `GEMINI_API_KEY`; kết quả luôn qua `parseAnalyzeResponse`.
Bước 4 hoàn thành: `app/api/analyze/route.ts` POST đọc `formData()`: `audio` phải là File với `type` bắt đầu `audio/` (ngược lại 400), quá 10 MB → 413; `history` mặc định `[]`, không parse JSON hoặc phần tử không hợp lệ → 400; lỗi Gemini/validate → 502 `{ error: "Failed to analyze audio" }` (không lộ key/stack, message chung); thành công → 200 `AnalyzeResponse`.
Bước 5 hoàn thành: `playwright.config.ts` thêm `env: { MOCK_GEMINI: "1" }` vào `webServer`; `tests/api-analyze.spec.ts` viết T1-T3 bằng `request` fixture gửi multipart. `npx playwright test tests/api-analyze.spec.ts` → 3/3 PASS (không gọi Gemini thật, dùng mock); `npm run typecheck` PASS. Toàn bộ 5 bước trong plan hoàn thành.

## Test status
- Lần chạy cuối: `npx playwright test tests/api-analyze.spec.ts` — 3 passed (2026-11-23); `npm run typecheck` — PASS.
- Kết quả từng test:
  - T1: PASS
  - T2: PASS
  - T3: PASS
- Fail chi tiết: không có.

## Verify
- `npx playwright test`: 4 passed (T1–T3 của analyze-api và T1 smoke). `npm run typecheck`, `npm run lint`: PASS.
- Gọi Gemini thật (audio tổng hợp bằng `say`: "I think working from home help me save time and I like it"):
  - `gemini-3.5-flash`: 200 sau ~21s. `raw_transcript` giữ nguyên lỗi ngữ pháp "help", warning help→helps, recast đúng, reply kết thúc bằng câu hỏi cụ thể, scaffolding đủ 3 ideas và 2 starters.
  - `gemini-3.8-flash` và `gemini-3.7-flash`: 503 "high demand" lúc test (phía Google, thử lại sau).
  - `gemini-2.5-flash`: 404 "no longer available to new users".
- Non-blocking: độ trễ ~21s quá chậm cho hội thoại, nên thử giảm thinking (`thinkingConfig`) và đo lại.
- Non-blocking: `reuseExistingServer` có thể dùng dev server không có `MOCK_GEMINI`; cân nhắc tắt khi chạy test API.

VERIFY: PASS

## Đã thử mà không được
-

## Số liệu
- Quota Claude:
- Quota Go:
- Số lần tự sửa:
- Model dùng:
