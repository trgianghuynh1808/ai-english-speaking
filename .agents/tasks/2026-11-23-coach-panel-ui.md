# Task: coach-panel-ui

Verify mode: light

## Mục tiêu
Giao diện hiện đặt lời thoại, gợi ý (Hints) và phản hồi (Feedback) chung trong một cột chat nên khó nhìn. Tách thành: cột Chat chỉ có lời thoại, và Coach Panel riêng chứa Hints (trên) và Feedback (dưới). Ưu tiên laptop; không làm tab mobile.

## Quyết định đã chốt
- Desktop (>= 1024px, class `lg:`): lưới hai cột `lg:grid-cols-[minmax(0,1fr)_380px]`; cột phải là Coach Panel sticky, cuộn riêng (`lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] overflow-y-auto`). Dưới `lg`: Panel xếp dưới chat (không tab).
- Chat chỉ giữ lời thoại: bubble bot (kèm `SpeakButton`), bubble user (kèm `PlayRecording`, nhãn "Repeat attempt", huy hiệu số cảnh báo phát âm, ví dụ "2 tips"). KHÔNG còn `FeedbackCard` hay `ScaffoldingBox` chen vào danh sách chat.
- Bubble user bấm được để chọn lượt (`aria-pressed`, `data-testid="user-turn"`); Panel hiện feedback của lượt được chọn, mặc định lượt user mới nhất (khi có lượt mới thì tự chọn lượt mới).
- Coach Panel gồm hai section: `data-testid="hints-section"` (tiêu đề "Hints", scaffolding của lượt bot CUỐI CÙNG, giữ blur 5 giây + Reveal now) rồi `data-testid="feedback-section"` (tiêu đề "Feedback"). Chưa có feedback thì hiện chỗ trống: "Your feedback will appear here after you speak."
- FeedbackCard chia 3 khối rõ ràng: (1) "What we heard" (trích dẫn xám, chữ nghiêng); (2) "Fix these": mỗi cảnh báo một thẻ nhỏ `heard → intended` (đỏ → xanh) kèm tip; ẩn khối nếu không có cảnh báo, thay bằng dòng "No pronunciation issues spotted"; (3) "Say it naturally": khung xanh chứa `better_expression`, nút **Listen** (đọc bằng `useSpeech`) và nút **Say it again** (chỉ khi được phép lặp, giữ `data-testid="repeat-button"`).
- Giữ nguyên logic: API, localStorage, TTS, chế độ lặp, khoá rate limit. Giữ các testid cũ: `app-title`, `conversation` (nay chỉ bao danh sách chat), `record-button`, `record-timer`, `feedback-card`, `scaffolding-box`, `reveal-button`, `speak-button`, `play-recording`, `auto-speak-toggle`, `new-conversation`, `repeat-button`, `repeat-banner`.
- Recorder, banner lặp, thông báo trạng thái, Toolbar nằm trong cột chat (bên dưới danh sách chat).
- Ngoài phạm vi: tab mobile, dark mode, đổi API/schema.
- Test mock bằng `page.route`; KHÔNG gọi Gemini thật. KHÔNG đọc/sửa/commit `.env.local`.

## Ngữ cảnh
- Next.js 16; client component cần `"use client"`; Tailwind v4.
- `components/Conversation.tsx` giữ state/logic: `turns`, `restoredCount`, `hydrated`, `autoSpeak`, `sending`, `status`, `locked`, `repeatTarget`, `findRepeatableTurn(turns)`; render `Toolbar`, `TurnList`, trạng thái gửi/lỗi, banner lặp `repeat-banner`, `Recorder`.
- `components/conversation/TurnList.tsx` hiện render từng lượt: user (bubble + `PlayRecording` + nhãn "Repeat attempt" + `FeedbackCard`), bot (bubble + `SpeakButton` + `ScaffoldingBox` với `defaultRevealed={index < restoredCount}`), prop `repeatableIndex`, `onRepeat`.
- `components/conversation/Toolbar.tsx`: Auto-speak và New conversation.
- `components/FeedbackCard.tsx`: `FeedbackCard({ analysis, onRepeat? })` với `data-testid="feedback-card"`; `components/ScaffoldingBox.tsx`: `ScaffoldingBox({ ideas, sentence_starters, turnKey, defaultRevealed? })` (key gồm `defaultRevealed`).
- `lib/useSpeech.ts`: `useSpeech()` → `{ supported, speaking, speak, cancel }`.
- Test hiện có: `tests/conversation.spec.ts`, `tests/conversation-audio.spec.ts`, `tests/repeat-recast.spec.ts`, `tests/smoke.spec.ts`, `tests/api-analyze.spec.ts` (mẫu mock `page.route`, mic giả, `addInitScript` giả `speechSynthesis`). Nhiều test có thể dùng `page.getByTestId("conversation").getByTestId("feedback-card")` hoặc tương tự; vì feedback/scaffolding nay nằm ngoài `conversation` nên chỉ chỉnh selector (dùng `page.getByTestId(...)` toàn trang hoặc `coach-panel`) — KHÔNG đổi ý nghĩa test.
- Viewport mặc định của Playwright 1280x720 (>= lg).
- Thêm `data-testid="coach-panel"` cho khung Panel.
- Icon: `lucide-react`.

## Plan
- [x] 1. [vừa] `components/conversation/ChatThread.tsx` → component mới (đổi tên/thay `TurnList.tsx`, xoá file cũ nếu không dùng) chỉ render bubble: bot (`SpeakButton`), user (`PlayRecording`, nhãn "Repeat attempt", huy hiệu số cảnh báo `"N tip(s)"` khi N > 0). Bubble user là `<button>` hoặc có `role="button"` với `aria-pressed={selected}`, `data-testid="user-turn"`, `onClick` gọi `onSelectUser(index)`; style nổi bật khi được chọn. Props: `turns`, `selectedIndex`, `onSelectUser`. Bao ngoài giữ `data-testid="conversation"`, vùng cuộn (`max-h`, cuộn xuống đáy khi có lượt mới).
- [x] 2. [vừa] `components/FeedbackCard.tsx` → thiết kế lại thành 3 khối theo Quyết định đã chốt. Thêm `Listen` cho `better_expression` bằng `useSpeech` (nút có `data-testid="speak-natural"`), giữ `Say it again` (`repeat-button`, gọi `onRepeat`). Giữ `data-testid="feedback-card"`.
- [x] 3. [vừa] `components/conversation/CoachPanel.tsx` → component mới `CoachPanel({ scaffolding, scaffoldingKey, defaultRevealed, analysis, onRepeat })` (`data-testid="coach-panel"`): section Hints (`hints-section`) dùng `ScaffoldingBox`, section Feedback (`feedback-section`) dùng `FeedbackCard` hoặc trạng thái trống. Tiêu đề section rõ ràng, khoảng cách và viền phân tách hai khối.
- [x] 4. [vừa] `components/Conversation.tsx` → bố cục lưới hai cột theo Quyết định đã chốt; thêm state `selectedUserIndex: number | null` (null = lượt user mới nhất); tự chọn lượt mới khi có phản hồi mới; Hints lấy từ lượt bot cuối (`defaultRevealed = lastBotIndex < restoredCount`, `scaffoldingKey = lastBotIndex`); `onRepeat` chỉ truyền khi lượt đang xem chính là lượt repeatable mới nhất (`findRepeatableTurn`); Recorder, Toolbar, banner lặp, trạng thái nằm trong cột chat dưới `ChatThread`. Đưa `ChatThread` vào, bỏ `TurnList`.
- [x] 5. [vừa] `tests/coach-panel.spec.ts` + chỉnh các spec cũ → viết T1, T2 (mock `page.route`, mic giả). Chỉnh selector trong `tests/conversation.spec.ts`, `tests/conversation-audio.spec.ts`, `tests/repeat-recast.spec.ts` cho khớp vị trí mới. Chạy `npx playwright test` (toàn bộ), `npm run typecheck`, `npm run lint`. Cổng 3000 phải trống; nếu bị chiếm bởi dev server của người dùng thì dừng và ghi vào "Đã thử mà không được".

- [x] 6. Fix: [dễ] `app/page.tsx` → khung `<main>` đang `max-w-3xl` (768px) làm cột chat chỉ ~320px trên laptop; đổi thành `max-w-6xl` (giữ `mx-auto`, `p-6`). `components/Conversation.tsx` → đổi lưới thành `lg:grid-cols-[minmax(0,1fr)_420px]`, bỏ cột chat cố định bề rộng nếu có; vùng chat dùng `lg:max-h-[calc(100vh-14rem)]` thay cho `max-h-[60vh]` để tận dụng chiều cao; đặt thanh công cụ (Auto-speak, New conversation) và `Recorder` căn giữa trong cột chat; trong `ScaffoldingBox` cho dòng đếm ngược và nút `Reveal now` không bị bẻ dòng (`flex-wrap`, nút `whitespace-nowrap shrink-0`). Chạy `npx playwright test` (toàn bộ), `npm run typecheck` và `npm run lint`.

## Test cases
- [x] T1. Tách khối — sau một lượt, `conversation` KHÔNG chứa `feedback-card` hay `scaffolding-box`; `hints-section` và `feedback-section` nằm trong `coach-panel`; feedback hiển thị transcript, lỗi (`heard → intended`) và câu tự nhiên — tests/coach-panel.spec.ts
- [x] T2. Chọn lượt cũ — ghi hai lượt (mock trả nội dung khác nhau), bấm `user-turn` đầu tiên thì `feedback-section` hiện transcript của lượt đó; lượt mới nhất được chọn lại khi có lượt mới — tests/coach-panel.spec.ts

## Trạng thái hiện tại
Đã xong cả 6 bước. Bước 5: viết mới `tests/coach-panel.spec.ts` (T1, T2, mock `page.route` 3 nội dung khác nhau + mic giả theo config sẵn có); chỉnh selector trong `tests/conversation.spec.ts` (T1: scaffolding-box giờ chỉ 1 trong panel, đổi xác nhận "hints mới" sang so nội dung opener → mock; T2: đảo thứ tự — opener tự clear sau 5s trước khi ghi, box mới remount blur + reveal) và `tests/conversation-audio.spec.ts` (T1: sync lượt 2 bằng `user-turn` count 2 thay vì `feedback-card` count 2; T2: scaffolding-box count 1, `first()` thay `nth(1)`). `tests/repeat-recast.spec.ts` không cần chỉnh (selector toàn trang vẫn duy nhất). Bước 6: `app/page.tsx` lên `max-w-6xl`; `components/Conversation.tsx` lưới `420px`; `ScaffoldingBox` thêm `flex-wrap gap-2` + nút `whitespace-nowrap shrink-0`. Ngoài danh sách file của plan: `components/conversation/ChatThread.tsx` (chứa class `max-h-[60vh]` cần đổi thành `lg:max-h-[calc(100vh-14rem)]`) và `components/conversation/Toolbar.tsx` (`justify-between` → `justify-center` để thanh công cụ căn giữa cột chat) — lý do: các class này nằm trong hai file đó, không phải trong `Conversation.tsx`. Chạy `npx playwright test` (15/15 pass), `npm run typecheck`, `npm run lint` — đều PASS. Cổng 3000 trống trước và sau khi chạy.

## Test status
- Lần chạy cuối (bước 6): `npx playwright test` (toàn bộ, 15/15 pass — 16.1s), `npm run typecheck` PASS, `npm run lint` PASS.
- Kết quả từng test:
  - T1: PASS (tests/coach-panel.spec.ts — tách khối: conversation không chứa feedback-card/scaffolding-box; hints-section + feedback-section nằm trong coach-panel; feedback đủ transcript, heard→intended, câu tự nhiên)
  - T2: PASS (tests/coach-panel.spec.ts — bấm user-turn đầu tiên hiện transcript lượt đó; lượt mới nhất được chọn lại khi có lượt mới, aria-pressed đúng)
- Fail chi tiết:

## Verify
- `npx playwright test` (toàn bộ, cổng 3000 trống): 15 passed. `npm run typecheck`, `npm run lint`: PASS.
- Vòng đầu: bố cục đúng ý nhưng `max-w-3xl` làm cột chat chỉ ~320px (bubble bị bẻ dòng, Reveal now xuống dòng) — `test-results/verify/11-panel-empty.png`, `12-panel-two-turns.png`. Fix cycle 1 (bước 6) nới khung lên `max-w-6xl`, cột Panel 420px.
- Sau fix (1440px): Chat rộng, Hints trên và Feedback dưới trong Coach Panel; Feedback chia "What we heard / Fix these / Say it naturally"; bấm bubble lượt cũ thì Panel đổi sang feedback lượt đó (huy hiệu "2 tips") — `13-panel-select-old.png`: PASS. Trạng thái trống hiển thị hướng dẫn — `11-panel-empty.png`: PASS.
- Thu hẹp (900px): Panel xếp dưới chat, chat không vỡ — `14-narrow.png`: PASS.
- Non-blocking: nút "Play my recording" trên bubble xanh có độ tương phản thấp (trông như bị khoá); nên tăng độ tương phản.
- Non-blocking: dưới `lg` Panel nằm dưới cùng nên phải cuộn mới thấy phản hồi (đã chấp nhận vì ưu tiên laptop).

VERIFY: PASS

## Đã thử mà không được
-

## Số liệu
- Quota Claude:
- Quota Go:
- Số lần tự sửa:
- Model dùng:
