# Task: repeat-recast

Verify mode: light

## Mục tiêu
Sau khi bot recast câu của người học, người học có thể bấm "Say it again" và nói lại câu tự nhiên; app so sánh với câu mẫu. Đồng thời dọn nợ task 4: sửa blur lượt mở đầu sau reload, tách `Conversation.tsx`, thêm test tự dừng 60 giây.

## Quyết định đã chốt
- Thêm trường form tuỳ chọn `target` (câu mẫu) vào `/api/analyze`. Có `target`: prompt dặn Gemini vẫn ghi `raw_transcript` đúng cái nghe được (không sửa), warnings đối chiếu với `target` (tối đa 2), `better_expression` là chính câu mẫu, `bot_reply` ngắn gọn khen rồi nối tiếp bằng một câu hỏi mới cụ thể. Schema JSON giữ nguyên.
- `target` tối đa 300 ký tự; rỗng thì bỏ qua; quá dài → 400.
- Nút "Say it again" (`data-testid="repeat-button"`) chỉ ở `FeedbackCard` của lượt user MỚI NHẤT và chỉ khi `better_expression` khác `raw_transcript` (so sánh sau khi trim, không phân biệt hoa thường). Bấm → banner `repeat-banner` "Repeat: <câu mẫu>" kèm nút Cancel; ghi âm như bình thường; sau khi gửi thì xoá `repeatTarget`.
- Lượt lặp hiển thị như lượt user thường, kèm nhãn "Repeat attempt".
- Tách `Conversation.tsx` thành `components/conversation/Toolbar.tsx` và `components/conversation/TurnList.tsx` mà KHÔNG đổi hành vi; test cũ (`conversation.spec.ts`, `conversation-audio.spec.ts`) phải vẫn pass.
- Ngoài phạm vi: chấm điểm số, so khớp tự động ở client.
- Test mock bằng `page.route`; không gọi Gemini thật. KHÔNG đọc/sửa/commit `.env.local`.

## Ngữ cảnh
- Next.js 16: client component cần `"use client"`; đọc `node_modules/next/dist/docs/` khi cần.
- `lib/prompt.ts` hiện: `SYSTEM_PROMPT` và `buildUserPrompt(history: HistoryTurn[]): string` (6 lượt cuối, "User:/Coach:").
- `lib/gemini.ts`: `analyzeAudio({ audio, mimeType, history })` → model chính `GEMINI_MODEL` + fallback `GEMINI_FALLBACK_MODEL`, mock khi `MOCK_GEMINI === "1"`.
- `app/api/analyze/route.ts`: đọc `audio` (File) và `history` (chuỗi JSON); trả 400/413/429/502.
- `lib/client.ts`: `analyze(blob, history)` POST multipart; `ClientRateLimitError` cho 429.
- `components/Conversation.tsx` (~250 dòng) hiện chứa: state `turns`, `restoredCount`, `hydrated`, `autoSpeak`, `sending`, `status`, `locked`, ref `lockTimeoutRef`; hook `useSpeech`; thanh công cụ (nút `auto-speak-toggle`, `new-conversation`); danh sách lượt với `FeedbackCard`, `PlayRecording`, `SpeakButton`, `ScaffoldingBox` (`defaultRevealed={index < restoredCount}`); `Recorder` ở cuối.
- `components/FeedbackCard.tsx`: `FeedbackCard({ analysis })`.
- `components/ScaffoldingBox.tsx`: `<ScaffoldingContent key={turnKey} .../>` với `defaultRevealed`.
- `lib/useRecorder.ts`: `maxSeconds = 60`, đo bằng `Date.now()` trong `setInterval` 250ms, tự gọi `stopRecording()` khi `elapsed >= maxSeconds`.
- Playwright: `page.clock.install()` giả `Date` và timer; dùng `clock.fastForward(ms)`. Mic giả Chromium đã cấu hình. Mẫu test (mock JSON, `page.route`, `addInitScript`) xem `tests/conversation.spec.ts` và `tests/conversation-audio.spec.ts`.
- data-testid mới: `repeat-button`, `repeat-banner`.

## Plan
- [x] 1. [vừa] `lib/prompt.ts` → `buildUserPrompt(history: HistoryTurn[], target?: string)`. Khi có `target` (đã trim, không rỗng) thêm một đoạn tiếng Anh vào cuối prompt theo Quyết định đã chốt. Khi không có `target` thì kết quả y hệt hiện tại.
- [x] 2. [vừa] `lib/gemini.ts`, `app/api/analyze/route.ts`, `lib/client.ts` → truyền `target` xuyên suốt: route đọc field form `target` (chuỗi; rỗng sau trim thì bỏ qua; dài hơn 300 ký tự → 400 `{ error: "'target' is too long" }`), `analyzeAudio({ ..., target })`, `analyze(blob, history, target?)` gửi field `target` khi có. Chạy `npx playwright test tests/api-analyze.spec.ts` để chắc không vỡ.
- [x] 3. [dễ] `components/ScaffoldingBox.tsx` → đặt `key={`${turnKey}-${defaultRevealed ? "r" : "h"}`}` cho `ScaffoldingContent` để lượt mở đầu được khôi phục hiện rõ ngay sau reload.
- [x] 4. [khó] `components/Conversation.tsx` → (a) tách `components/conversation/Toolbar.tsx` (Auto-speak + New conversation, props: `autoSpeak`, `onToggleAutoSpeak`, `onNewConversation`) và `components/conversation/TurnList.tsx` (danh sách lượt, props: `turns`, `restoredCount`, `repeatableIndex`, `onRepeat`); `Conversation.tsx` giữ state/logic. Chạy lại `npx playwright test tests/conversation.spec.ts tests/conversation-audio.spec.ts` sau bước tách để chắc hành vi không đổi. (b) Thêm chế độ lặp: state `repeatTarget: string | null`; `FeedbackCard` nhận `onRepeat?: () => void` và hiện nút `repeat-button` ("Say it again") chỉ cho lượt user mới nhất khi `better_expression` khác `raw_transcript`; khi bấm đặt `repeatTarget = better_expression`; banner `repeat-banner` "Repeat: <câu mẫu>" + nút Cancel (đặt `repeatTarget = null`) hiển thị trên `Recorder`; `handleUserAudio` gọi `analyze(blob, history, repeatTarget ?? undefined)` rồi xoá `repeatTarget`; lượt user tạo từ lần lặp có cờ `repeat: true` và nhãn "Repeat attempt" (không cần lưu cờ vào localStorage; thêm vào `StoredTurn`/`lib/storage.ts` nếu typecheck yêu cầu và giữ tương thích dữ liệu cũ).
- [x] 5. [vừa] `tests/repeat-recast.spec.ts` → viết T1–T3 (mock `/api/analyze` bằng `page.route`; T1 đọc `request.postData()` để kiểm field `target`; T2 dùng `page.clock.install()` trước `goto`, bấm ghi, `clock.fastForward(61_000)`, thấy request được gửi; T3 dùng `request` fixture gửi multipart có `target` dài 301 ký tự → 400 và `target` hợp lệ → 200 với `MOCK_GEMINI`). Chạy `npx playwright test tests/repeat-recast.spec.ts tests/conversation.spec.ts tests/conversation-audio.spec.ts`, rồi `npm run typecheck` và `npm run lint`. Nếu đồng hồ giả làm MediaRecorder lỗi, ghi vào "Đã thử mà không được" và đề xuất cách khác thay vì sửa `useRecorder.ts` tuỳ ý.

## Test cases
- [x] T1. Repeat flow — sau lượt đầu bấm `repeat-button` thấy `repeat-banner`; ghi lại thì request có field `target` bằng đúng `better_expression`, banner biến mất — tests/repeat-recast.spec.ts
- [x] T2. Auto-stop 60s — bắt đầu ghi, tua đồng hồ 61 giây thì tự dừng và bản ghi được gửi — tests/repeat-recast.spec.ts
- [x] T3. Target validation — `target` dài hơn 300 ký tự trả 400; `target` hợp lệ trả 200 (mock) — tests/repeat-recast.spec.ts

## Trạng thái hiện tại
Đã xong hết 5 bước: (1) `buildUserPrompt` nhận `target` tuỳ chọn; (2) truyền `target` qua route → gemini → client (validate 300 ký tự); (3) key `ScaffoldingContent` gồm `defaultRevealed`; (4) tách `conversation/Toolbar.tsx` + `conversation/TurnList.tsx` và thêm chế độ lặp (repeat-button, repeat-banner + Cancel, nhãn "Repeat attempt"); (5) viết `tests/repeat-recast.spec.ts` T1–T3. Typecheck + lint pass.

## Test status
- Lần chạy cuối: `npx playwright test tests/repeat-recast.spec.ts tests/conversation.spec.ts tests/conversation-audio.spec.ts` — 9 passed; `npm run typecheck` và `npm run lint` pass.
- Kết quả từng test:
  - T1: PASS (repeat flow: banner hiện, request có `target` = `better_expression`, banner biến mất, nhãn "Repeat attempt" hiện)
  - T2: PASS (clock.install + fastForward 61s → tự dừng, request được gửi; MediaRecorder không lỗi với đồng hồ giả)
  - T3: PASS (target 301 ký tự → 400 `'target' is too long`; target hợp lệ → 200 với MOCK_GEMINI)
- Fail chi tiết: Không. (Trước khi chạy, dev server cũ trên cổng 3000 không có `MOCK_GEMINI` (curl trả 502) → đã dừng để Playwright tự khởi động server đúng env.)

## Verify
- `npx playwright test` (toàn bộ, cổng 3000 trống): 13 passed. `npm run typecheck`, `npm run lint`: PASS. Test cũ của conversation vẫn pass sau khi tách component.
- Trình duyệt (API mock, mic giả): nút `Say it again` ở FeedbackCard lượt mới nhất — `test-results/verify/08-repeat-button.png`; banner `Repeat: <câu mẫu>` + Cancel phía trên recorder — `09-repeat-banner.png`; sau khi gửi lượt lặp, banner biến mất, bot trả lời kèm scaffolding mới — `10-repeat-done.png`: PASS.
- Review: `target` được trim, giới hạn 300 ký tự ở route; prompt chế độ lặp đúng quyết định (raw_transcript không sửa, warnings đối chiếu câu mẫu, tối đa 2). Test tự dừng 60s chạy được bằng đồng hồ giả.
- Non-blocking: chưa kiểm chất lượng chế độ lặp với Gemini thật và giọng người thật.

VERIFY: PASS

## Đã thử mà không được
-

## Số liệu
- Quota Claude:
- Quota Go:
- Số lần tự sửa:
- Model dùng:
