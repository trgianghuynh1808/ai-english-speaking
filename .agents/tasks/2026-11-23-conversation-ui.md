# Task: conversation-ui

Verify mode: light

## Mục tiêu
Người học bấm ghi âm, nói, dừng; audio được gửi tới `/api/analyze`; UI hiển thị feedback (transcript thô, lỗi phát âm, câu tự nhiên) và scaffolding của lượt bot tiếp theo. TTS để task sau.

## Quyết định đã chốt
- Hội thoại bắt đầu bằng một lượt bot cố định `OPENER` (câu hỏi cụ thể về công việc/thói quen hằng ngày + scaffolding), để người học không bao giờ phải nói trước mà không có gợi ý.
- Ghi âm `audio/webm`, tối đa 60 giây thì tự dừng.
- Scaffolding bị blur và đếm ngược 5 giây; nút "Reveal now" hiện rõ ngay; hết 5 giây tự hiện. Mỗi lượt bot mới reset.
- Route trả 429 `{ error: "rate_limited" }` khi Gemini báo 429; UI hiện "Bạn nói nhanh quá, đợi vài giây rồi thử lại" và khoá nút ghi âm ~10 giây. Lỗi khác: thông báo nhẹ nhàng, giữ nguyên hội thoại, không chê.
- Ngoài phạm vi: TTS, lưu lịch sử localStorage, tinh chỉnh responsive.
- Test dùng `page.route("**/api/analyze", ...)` để mock; không gọi Gemini thật.
- KHÔNG đọc, sửa hay commit `.env.local`.

## Ngữ cảnh
- Next.js 16: đọc `node_modules/next/dist/docs/` khi cần (client component cần `"use client"`).
- `lib/types.ts`: `AnalyzeResponse` (`user_analysis.{raw_transcript, pronunciation_warnings[{heard,intended,tip}], better_expression}`, `bot_reply.{text, hidden_scaffolding.{ideas, sentence_starters}}`), `HistoryTurn { role: "user" | "bot"; text: string }`.
- `lib/gemini.ts` hiện export `analyzeAudio(...)`; lỗi Gemini ném `Error` có chuỗi JSON `{"error":{"code":429,...}}` trong `message` (SDK ném `ApiError` có `status`). `app/api/analyze/route.ts` hiện trả 502 cho mọi lỗi từ `analyzeAudio`, 400/413 cho input sai.
- `app/page.tsx` hiện có `data-testid="app-title"` (h1) và `data-testid="conversation"` (khung trống); giữ cả hai testid.
- Playwright: Chromium mic giả (`--use-fake-device-for-media-stream`), permission microphone đã cấp trong `playwright.config.ts`; `webServer.env.MOCK_GEMINI = "1"`.
- Icon: `lucide-react` (`Mic`, `Square`, `Eye`, ...). Tailwind v4.
- data-testid cần có: `record-button`, `record-timer`, `feedback-card`, `scaffolding-box`, `reveal-button`.

## Plan
- [x] 1. [vừa] `lib/gemini.ts` → thêm `export class RateLimitError extends Error`, ném khi lỗi Gemini là 429 (kiểm `error.status === 429` hoặc code 429 trong message). Sửa `app/api/analyze/route.ts` trả `Response.json({ error: "rate_limited" }, { status: 429 })` cho `RateLimitError`; các lỗi khác vẫn 502. Chạy `npx playwright test tests/api-analyze.spec.ts` để chắc không vỡ.
- [x] 2. [dễ] `lib/opener.ts` → export `OPENER: { text: string; scaffolding: { ideas: string[]; sentence_starters: string[] } }` (2-3 ideas, 2 starters). Thêm `lib/client.ts` → `export class ClientRateLimitError extends Error` và `analyze(blob: Blob, history: HistoryTurn[]): Promise<AnalyzeResponse>` (POST multipart `audio` + `history` JSON tới `/api/analyze`; 429 → ném `ClientRateLimitError`; non-OK khác → ném `Error`).
- [x] 3. [khó] `lib/useRecorder.ts` → hook `useRecorder({ maxSeconds = 60 })` (`"use client"`) trả `{ state: "idle" | "recording", seconds, level, start(), stop(): Promise<Blob>, error }`. `getUserMedia({ audio: true })`, `MediaRecorder` mimeType `audio/webm`, `AnalyserNode` cho `level` 0..1 (cập nhật bằng requestAnimationFrame). Tự dừng ở `maxSeconds`; dọn track, AudioContext, interval khi dừng/unmount; từ chối quyền mic → đặt `error` (thông báo thân thiện).
- [x] 4. [vừa] `components/Recorder.tsx` → nút micro lớn (`Mic` khi idle, `Square` khi recording), timer `mm:ss`, thanh sóng theo `level`. Props `{ onComplete(blob: Blob): void; disabled?: boolean; disabledReason?: string }`; gọi `onComplete` khi dừng. `data-testid`: `record-button`, `record-timer`.
- [x] 5. [vừa] `components/FeedbackCard.tsx` → `FeedbackCard({ analysis: AnalyzeResponse["user_analysis"] })` với 3 khối: "What we heard" (raw_transcript), "Pronunciation" (mỗi warning `heard → intended` + tip; ẩn khối nếu mảng rỗng), "Natural version" (better_expression). `data-testid="feedback-card"`. `components/ScaffoldingBox.tsx` → `ScaffoldingBox({ ideas, sentence_starters, turnKey })`: blur + đếm ngược 5 giây, nút "Reveal now" (`data-testid="reveal-button"`), hiện rõ khi hết giờ hoặc bấm; reset khi `turnKey` đổi; `data-testid="scaffolding-box"`; có thể thu gọn.
- [x] 6. [vừa] `app/page.tsx` + `components/Conversation.tsx` (`"use client"`) → state `turns`; bắt đầu bằng `OPENER` (bubble bot + `ScaffoldingBox`). Khi `Recorder` xong: gọi `analyze(blob, history)` (history là `HistoryTurn[]` từ các lượt đã có; lượt user dùng `raw_transcript`), hiện loading, rồi thêm lượt user (kèm `FeedbackCard`) và lượt bot (kèm `ScaffoldingBox`). `ClientRateLimitError` → thông báo "Bạn nói nhanh quá, đợi vài giây rồi thử lại" và khoá `Recorder` ~10 giây (`disabled` + `disabledReason`); lỗi khác → thông báo nhẹ nhàng, giữ nguyên hội thoại. Giữ `app-title` và `conversation` testid; trang có layout cuộn tốt (lượt mới cuộn vào view).
- [x] 7. [vừa] `tests/conversation.spec.ts` → viết T1–T3 (mock `page.route`), mỗi test mở `/`, ghi ~2 giây bằng mic giả. Chạy `npx playwright test tests/conversation.spec.ts`, rồi `npm run typecheck` và `npm run lint`.

## Test cases
- [x] T1. Record to feedback — bấm ghi 2 giây, dừng, mock trả JSON, thấy `feedback-card` chứa transcript và `scaffolding-box` mới — tests/conversation.spec.ts
- [x] T2. Scaffolding blur — lượt mới bị mờ, `reveal-button` làm hiện rõ ngay; không bấm thì tự hiện sau 5 giây — tests/conversation.spec.ts
- [x] T3. Rate limit — mock trả 429, thấy thông báo thân thiện và `record-button` bị khoá tạm — tests/conversation.spec.ts

## Trạng thái hiện tại
Đã xong hết bước 1-7 (API 429, `OPENER` + client analyze, `useRecorder`, `Recorder`, `FeedbackCard`, `ScaffoldingBox`, `Conversation` + `page.tsx`, specs T1–T3). Chưa chạy Verify phase (mode: light). Ngoài phạm vi như cũ: TTS, lưu localStorage, responsive.

## Test status
- Lần chạy cuối: `npx playwright test tests/conversation.spec.ts` — 3 passed (12.0s); `npm run typecheck` pass; `npm run lint` pass.
- Kết quả từng test:
  - T1: PASS
  - T2: PASS
  - T3: PASS
- Fail chi tiết: lần chạy đầu T2 fail — "Reveal now" không dính: interval đếm ngược tính lại `remaining` từ wall-clock nên set blur lại sau khi bấm. Đã sửa `components/ScaffoldingBox.tsx` (tách `revealed` khỏi `remaining`, bấm reveal thì dừng interval); lần 2 pass. Riêng `npm run lint` (bước 7) còn báo 4 lỗi react-hooks (refs/set-state-in-effect) ở `components/Recorder.tsx`, `components/ScaffoldingBox.tsx`, `lib/useRecorder.ts` (cả ba là file có trong plan) — đã sửa: gán ref trong `useEffect`, remount nội bộ bằng `key={turnKey}`, bỏ ref-latest trong `useRecorder`. Typecheck vẫn pass sau mỗi lần sửa.

## Verify
- `npx playwright test`: 7 passed (T1–T3 conversation, T1–T3 analyze-api, smoke). `npm run typecheck`, `npm run lint`: PASS.
- Trình duyệt (mock Gemini, mic giả): 
  - Lượt mở đầu: scaffolding bị blur kèm "Hints mở sau 5s" và nút Reveal now — `test-results/verify/01-initial-blur.png`; sau 5s hiện rõ — `02-after-5s.png`: PASS.
  - Ghi âm rồi dừng: FeedbackCard (Pronunciation `workin → working`, `help → helps`, Natural version) cùng bubble bot và scaffolding mới bị blur — `03-recording.png`, `04-feedback.png`: PASS.
  - Quyền mic bị từ chối (`playwright-cli` không có mic): hiện thông báo tiếng Việt thân thiện, không crash: PASS.
- Non-blocking: `setTimeout` mở khoá recorder trong `components/Conversation.tsx` chưa được dọn khi unmount.
- Non-blocking: chưa kiểm tra tự dừng 60s (không có test).

VERIFY: PASS

## Đã thử mà không được
-

## Số liệu
- Quota Claude:
- Quota Go:
- Số lần tự sửa:
- Model dùng:
