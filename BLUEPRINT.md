# AI English Speaking Coach - Technical & Implementation Blueprint

## 1. Project Overview & Core Mission
Build a web-based English Speaking Practice App designed specifically for an advanced-level reader/listener (80% passive comprehension) who struggles with active speech generation (blanking out, word retrieval) and pronunciation accuracy.

### Critical System Constraint (Anti-Hallucination Audio Processing)
* **The Problem:** Standard Speech-to-Text (STT) or real-time voice modes (like Gemini Live) suffer from language model bias—they auto-correct mispronounced words based on context, hiding pronunciation mistakes from the user.
* **The Solution:** **DO NOT** use browser speech recognition or text-only pipelines. Capture raw audio blobs via the browser's `MediaRecorder API` and send the raw audio file directly to a Multimodal LLM (e.g., Gemini 2.5 Flash API) that processes the audio waveform directly.
* **Strict Prompt Rule for Audio:** Instruct the model to listen to the *raw phonetic sounds* in the user's audio, transcribe what was *actually heard* phonetically (without context-based auto-correction), and flag mispronounced words or missing ending sounds.

---

## 2. Core Pedagogical Mechanisms (UX & Logic)

1. **Scaffolding (Anti-Blanking / Mớm ý):**
   * Do not ask open-ended questions that cause user paralysis.
   * Every turn from the bot must include hidden/collapsible scaffolding:
     * **Keywords/Ideas:** 2–3 short idea bullet points.
     * **Sentence Starters:** Pre-baked structural templates to fill in.
   * *UI Rule:* Scaffolding is hidden/blurred by default for 5 seconds to encourage active recall, with a reveal button if the user is stuck.

2. **Code-Switching & Recasting (Bản nháp Việt-Anh):**
   * Allow the user to mix Vietnamese when they get stuck (e.g., *"I think working from home giúp tôi tiết kiệm thời gian..."*).
   * The bot must never scold, but instantly recast the mixed sentence into natural, professional English and ask the user to repeat it.

3. **Micro-Correction (Gỡ rối 1 điểm chạm):**
   * Keep feedback light to avoid cognitive overload. Fix at most 1–2 critical pronunciation/grammar issues per turn while keeping the conversation flowing.

---

## 3. API & Data Flow (Per Turn)

```
[Frontend (React/Next.js)]
│
├─ 1. User records audio (MediaRecorder API) -> Sends raw audio blob + conversation history
│
[Backend API Route]
│
├─ 2. Forwards raw audio to Multimodal LLM (Gemini API) with strict phonetic prompt
│
[LLM Processing]
│
├─ 3. Analyzes raw audio waveform & returns strict JSON response
│
[Frontend Rendering]
├─ Displays: Raw Transcript (what AI actually heard) + Pronunciation Feedback + Natural Recast
├─ Plays: Bot's next question via Text-to-Speech (TTS)
└─ Renders: Next round's hidden scaffolding hints
```

---

## 4. Expected JSON Response Schema
The backend API must parse and return a strict JSON payload adhering to this structure:

```json
{
  "user_analysis": {
    "raw_transcript": "What the AI actually heard from the audio waveform (no auto-correction)",
    "pronunciation_warnings": [
      {
        "heard": "word heard by AI",
        "intended": "likely intended word",
        "tip": "Specific phonetic or ending-sound correction tip"
      }
    ],
    "better_expression": "The polished, natural version of what the user tried to say (including translation of any Vietnamese mix)"
  },
  "bot_reply": {
    "text": "The conversational reply and the next question to keep the dialogue flowing",
    "hidden_scaffolding": {
      "ideas": [
        "Idea hint 1",
        "Idea hint 2"
      ],
      "sentence_starters": [
        "Starter template 1...",
        "Starter template 2..."
      ]
    }
  }
}
```

---

## 5. Suggested Tech Stack & Implementation Steps
* **Frontend:** Next.js (App Router) / Vite React, Tailwind CSS, Lucide icons.
* **Audio Handling:** `navigator.mediaDevices.getUserMedia` + `MediaRecorder` targeting `.webm`.
* **TTS:** Browser native `window.speechSynthesis` (Web Speech API) to read bot questions aloud.
* **AI Integration:** Google Gemini API (multimodal endpoint supporting audio input).

### Action Items
1. Initialize project structure with components for:
   * Voice recorder button (hold/click to record with visual wave/timer).
   * Feedback comparison card (Raw Transcript vs. Natural Recast vs. Pronunciation Tips).
   * Collapsible Scaffolding Box (Ideas & Sentence Starters).
2. Set up the backend API route handling multipart form data (audio blob + history).
3. Write the robust System Prompt for Gemini enforcing raw phonetic listening and JSON output compliance.
