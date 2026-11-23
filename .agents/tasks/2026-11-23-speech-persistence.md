# Task: speech-persistence

Verify mode: light

## Mục tiêu
Bot đọc to câu hỏi (TTS) để người học luyện nghe; người học nghe lại bản ghi của chính mình; hội thoại không mất khi tải lại trang.

## Quyết định đã chốt
- TTS bằng `window.speechSynthesis`: ưu tiên giọng `en-US` (không có thì `en-*`), `rate 0.95`, `cancel()` trước mỗi lần `speak`. Mặc định tự đọc câu trả lời của bot, có công tắc **Auto-speak** (lưu localStorage). Lượt mở đầu (`OPENER`) chỉ có nút Listen (Chrome chặn autoplay khi chưa có thao tác người dùng).
- Nghe lại bản ghi: giữ `Blob` trong bộ nhớ, tạo object URL, thu hồi khi unmount. KHÔNG lưu blob vào localStorage.
- Lưu hội thoại: localStorage khoá `aesc.conversation.v1`, chỉ lưu chữ (lượt, `user_analysis`, scaffolding). Dữ liệu hỏng/sai hình dạng thì bỏ qua và bắt đầu mới. Khoá `aesc.autoSpeak` cho công tắc.
- Khôi phục: scaffolding của lượt cũ hiện rõ ngay (không blur, không đếm ngược). Lượt bot mới sau khi nói vẫn blur 5 giây như cũ.
- Nút "New conversation" xoá localStorage hội thoại và quay về `OPENER`.
- Dọn nợ: `setTimeout` mở khoá recorder trong `Conversation.tsx` phải được dọn khi unmount.
- Ngoài phạm vi: chọn giọng, đổi tốc độ, nhiều hội thoại, test tự dừng 60s.
- Test mock `/api/analyze` bằng `page.route`; KHÔNG gọi Gemini thật. KHÔNG đọc/sửa/commit `.env.local`.

## Ngữ cảnh
- Next.js 16: client component cần `"use client"`; đọc `node_modules/next/dist/docs/` khi cần. Đọc từ localStorage chỉ trong `useEffect` sau mount để tránh lệch SSR/hydration.
- `components/Conversation.tsx` hiện: `type Turn = { kind: "user"; text; analysis } | { kind: "bot"; text; scaffolding: { ideas; sentence_starters } }`; `INITIAL_TURNS` từ `OPENER` (`lib/opener.ts`); `handleUserAudio(blob)` gọi `analyze(blob, history)` (`lib/client.ts`) rồi append lượt user + lượt bot; `ClientRateLimitError` → khoá recorder 10s bằng `setTimeout(() => setLocked(false), RATE_LIMIT_LOCK_MS)`; `data-testid="conversation"` bao danh sách lượt.
- `components/ScaffoldingBox.tsx`: `ScaffoldingBox({ ideas, sentence_starters, turnKey })` bọc `ScaffoldingContent` (remount theo `turnKey`, state `remaining`, `revealed`, interval 250ms, nút `reveal-button`).
- `components/Recorder.tsx` gọi `onComplete(blob)`; `lib/types.ts` có `AnalyzeResponse`, `HistoryTurn`.
- Test hiện có dùng `page.route("**/api/analyze", ...)` và mic giả (xem `tests/conversation.spec.ts` để tái dùng helper/mock JSON).
- data-testid mới: `speak-button`, `play-recording`, `new-conversation`, `auto-speak-toggle`.
- Icon: `lucide-react` (`Volume2`, `VolumeX`, `Play`, `RotateCcw`).

## Plan
- [x] 1. [vừa] `lib/useSpeech.ts` → hook `useSpeech()` (`"use client"`) trả `{ supported: boolean; speaking: boolean; speak(text: string): void; cancel(): void }`. Chọn giọng `en-US` rồi `en-*`; voices có thể nạp muộn nên lắng nghe `voiceschanged`; cập nhật `speaking` qua `onstart`/`onend`/`onerror`; `cancel()` trước mỗi `speak`; huỷ khi unmount; `supported=false` khi không có `window.speechSynthesis`.
- [x] 2. [vừa] `components/SpeakButton.tsx` → `SpeakButton({ text })` dùng `useSpeech`, icon `Volume2` (đang đọc thì `VolumeX` để dừng), ẩn nếu không `supported`, `data-testid="speak-button"`. `components/PlayRecording.tsx` → `PlayRecording({ blob })`: tạo object URL trong `useEffect` (thu hồi khi cleanup), nút Play phát bằng `new Audio(url)`, `data-testid="play-recording"`.
- [x] 3. [vừa] `lib/storage.ts` → export `loadConversation(): StoredTurn[] | null`, `saveConversation(turns: StoredTurn[]): void`, `clearConversation()`, `loadAutoSpeak(): boolean` (mặc định `true`), `saveAutoSpeak(v: boolean)`. `StoredTurn` giống `Turn` nhưng không có blob. Mọi truy cập bọc try/catch; kiểm tra hình dạng dữ liệu, sai thì trả `null`.
- [x] 4. [dễ] `components/ScaffoldingBox.tsx` → thêm prop `defaultRevealed?: boolean`; khi `true` thì `revealed` khởi tạo `true`, không chạy đếm ngược và không hiện nút `reveal-button`.
- [x] 5. [khó] `components/Conversation.tsx` → ghép: (a) thêm `SpeakButton` vào bubble bot, `PlayRecording` vào lượt user của phiên hiện tại (lưu `blob` trong state, không đưa vào storage); (b) công tắc **Auto-speak** (`data-testid="auto-speak-toggle"`, đọc/ghi bằng `loadAutoSpeak/saveAutoSpeak`): khi bật, sau mỗi phản hồi tự `speak` câu trả lời của bot (dùng `useSpeech` ở đây); (c) nạp hội thoại bằng `loadConversation()` trong `useEffect` sau mount, lưu bằng `saveConversation` mỗi khi `turns` đổi; lượt khôi phục dùng `defaultRevealed`; (d) nút **New conversation** (`data-testid="new-conversation"`) gọi `clearConversation()` và đặt lại `INITIAL_TURNS`; (e) dọn `setTimeout` mở khoá bằng `ref` + cleanup trong `useEffect`.
- [x] 6. [vừa] `tests/conversation-audio.spec.ts` → viết T1–T3 (mock `/api/analyze` bằng `page.route`, giả `speechSynthesis` bằng `page.addInitScript` ghi lại các lần `speak` vào `window.__spoken`). Chạy `npx playwright test tests/conversation-audio.spec.ts`, rồi `npm run typecheck` và `npm run lint`.

## Test cases
- [x] T1. Bot speaks — sau lượt ghi, `speak` được gọi với đúng câu trả lời của bot; tắt Auto-speak rồi ghi tiếp thì không gọi thêm — tests/conversation-audio.spec.ts
- [x] T2. Persistence — ghi một lượt, reload, lượt cũ còn và scaffolding hiện rõ (không blur); bấm New conversation thì chỉ còn `OPENER` — tests/conversation-audio.spec.ts
- [x] T3. Replay own audio — lượt user có `play-recording`, bấm vào thì tạo audio từ blob và không lỗi — tests/conversation-audio.spec.ts

## Trạng thái hiện tại
## Trạng thái hiện tại
Xong cả 6 bước. Typecheck, lint và spec mới đều pass. Chờ Verify.

## Test status
- Lần chạy cuối: `npx playwright test tests/conversation-audio.spec.ts` — 3 passed (11.2s); `npm run typecheck` và `npm run lint` sạch.
- Kết quả từng test:
  - T1: PASS
  - T2: PASS
  - T3: PASS
- Fail chi tiết:
  - Lần đầu T2 fail vì `addInitScript` xoá localStorage ở mọi lần navigation (kể cả reload); sửa bằng cờ `sessionStorage` để chỉ xoá ở lần load đầu.

## Verify
- `npx playwright test tests/conversation.spec.ts tests/conversation-audio.spec.ts tests/smoke.spec.ts`: 7 passed (bỏ `api-analyze` vì cổng 3000 đang có dev server của người dùng, tránh gọi Gemini thật). `npm run typecheck`, `npm run lint`: PASS.
- Trình duyệt (API mock, mic giả): thanh công cụ `Auto-speak on` và `New conversation` hiển thị đúng; bubble user có `Play my recording`, bubble bot có `Listen` — `test-results/verify/06-turn-controls.png`: PASS. Sau reload, các lượt được khôi phục, scaffolding lượt bot cuối hiện rõ — `07-after-reload.png`: PASS.
- Non-blocking: sau reload, scaffolding của lượt mở đầu (index 0) bị blur lại vài giây vì `ScaffoldingContent` đã mount trước khi hydrate (key `turnKey` không đổi nên `defaultRevealed` không áp dụng). Gợi ý sửa: đưa `defaultRevealed` vào `key`. Tương tự sau "New conversation" lượt mở đầu giữ trạng thái cũ.
- Non-blocking: `Conversation.tsx` đang ~250 dòng, cân nhắc tách `Toolbar` và `TurnList` khi thêm tính năng.

VERIFY: PASS

## Đã thử mà không được
-

## Số liệu
- Quota Claude:
- Quota Go:
- Số lần tự sửa:
- Model dùng:
