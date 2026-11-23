# Cấu hình scripts/run-task.sh cho ai-english-speaking

# Model theo nhãn: [dễ] [vừa] [khó]
MODELS=(
  "opencode-go/deepseek-v4.1-flash"   # [dễ]
  "opencode-go/glm-5.3"               # [vừa] mặc định (bước không thuộc app/, components/ hay lib/, vd tests/)
  "opencode-go/glm-5.3"               # [khó] (nhiều tầng: UI + API + prompt); kẹt nữa thì chuyển Claude
)

# [vừa] chọn model theo thư mục của file đầu tiên trong bước
MEDIUM_RULES=(
  "components/=opencode-go/glm-5.3"               # UI (recorder, feedback card, scaffolding): dùng model mạnh hơn
  "app/=opencode-go/glm-5.3"                      # pages + API route
  "lib/=opencode-go/deepseek-v4.1-flash"          # logic/prompt/types: thử DeepSeek, fail thì leo lên GLM
)

# Verify do Claude làm (gõ "verify" sau khi OpenCode xong) để tiết kiệm quota OpenCode
DEFAULT_VERIFY_AGENT="claude"
DEFAULT_VERIFY_MODEL="opencode-go/gemini-4-argon"   # chỉ dùng khi VERIFY_AGENT=opencode
DEFAULT_VERIFY_URL="http://localhost:3000"
DEFAULT_CHECK_HINT="npm run typecheck"
DEFAULT_VERIFY_HINT="Mic giả: Chromium chạy với --use-fake-device-for-media-stream. Không gọi Gemini thật, mock route /api/analyze."

BATCH_MAX="${BATCH_MAX:-4}"
MAX_RUNS="${MAX_RUNS:-20}"
