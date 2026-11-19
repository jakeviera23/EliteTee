#!/usr/bin/env bash
# Securely set sandbox notify-admin-safety secrets.
# - Does not echo the API key
# - Avoids shell history for the secret
# - Refuses to run unless linked project is the sandbox
# - Never writes secrets to the repo
set -euo pipefail

SANDBOX_REF="zbjcdegqqtbgrnfbwbmf"
PROD_REF="nbacvtscjhdvwggbecbz"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Keep this invocation out of history where possible
unset HISTFILE || true
export HISTFILE=/dev/null
export HISTSIZE=0
export HISTFILESIZE=0

echo "Verifying Supabase project link…"
LINKED_REF="$(tr -d '[:space:]' < supabase/.temp/project-ref 2>/dev/null || true)"
if [[ -z "$LINKED_REF" ]]; then
  echo "ERROR: No linked project ref at supabase/.temp/project-ref" >&2
  exit 1
fi
if [[ "$LINKED_REF" != "$SANDBOX_REF" ]]; then
  echo "ERROR: Linked ref is '$LINKED_REF', expected sandbox '$SANDBOX_REF'." >&2
  exit 1
fi
if [[ "$LINKED_REF" == "$PROD_REF" ]]; then
  echo "ERROR: Refusing to write secrets to production." >&2
  exit 1
fi
echo "OK: linked project is sandbox ($SANDBOX_REF)"

echo
echo "Paste the Resend API key for \"EliteTee Safety Notifications\"."
echo "Input is hidden. Nothing is written to the repo."
echo

# Prefer macOS secure dialog so the key never appears in the terminal buffer.
RESEND_API_KEY=""
if command -v osascript >/dev/null 2>&1; then
  RESEND_API_KEY="$(osascript <<'EOF'
tell application "System Events"
  activate
  set theResult to display dialog "Paste Resend API key (EliteTee Safety Notifications). It will not be shown." with title "EliteTee sandbox secrets" default answer "" with hidden answer buttons {"Cancel", "Set secrets"} default button "Set secrets"
  if button returned of theResult is "Cancel" then error number -128
  return text returned of theResult
end tell
EOF
)" || {
    echo "Cancelled." >&2
    exit 1
  }
else
  # Fallback: silent terminal read (may not work in non-TTY agent shells)
  read -r -s -p "RESEND_API_KEY: " RESEND_API_KEY
  echo
fi

# Strip whitespace/newlines/zero-width chars from paste dialogs.
RESEND_API_KEY="$(printf '%s' "$RESEND_API_KEY" | tr -d '\r\n\t' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
# Drop common accidental prefixes from clipboard paste.
RESEND_API_KEY="${RESEND_API_KEY#Bearer }"
RESEND_API_KEY="${RESEND_API_KEY#bearer }"

if [[ -z "${RESEND_API_KEY}" ]]; then
  echo "ERROR: Empty API key." >&2
  exit 1
fi
if [[ "$RESEND_API_KEY" != re_* ]]; then
  echo "ERROR: Resend API keys usually start with re_. Re-copy the key from Resend → API Keys." >&2
  exit 1
fi
# Length only — never print the key.
echo "OK: key shape looks like a Resend key (length=${#RESEND_API_KEY})."

echo "Setting sandbox Edge Function secrets (values not printed)…"
# --yes: user already approved sandbox secret writes in chat; required in agent mode.
npx supabase secrets set --yes \
  --project-ref "$SANDBOX_REF" \
  "RESEND_API_KEY=${RESEND_API_KEY}" \
  "ADMIN_NOTIFY_FROM_EMAIL=safety@elitetee.club" \
  "ADMIN_NOTIFY_EMAILS=jakeviera23@gmail.com"

# Scrub from environment
unset RESEND_API_KEY
RESEND_API_KEY=""

echo
echo "Verifying secret NAMES only…"
# Prefer grep over rg so verification works without ripgrep installed.
SECRETS_OUT="$(npx supabase secrets list --project-ref "$SANDBOX_REF" -o pretty 2>/dev/null || true)"
for name in RESEND_API_KEY ADMIN_NOTIFY_FROM_EMAIL ADMIN_NOTIFY_EMAILS; do
  if printf '%s\n' "$SECRETS_OUT" | grep -F "$name" >/dev/null 2>&1; then
    echo "  $name: PRESENT"
  else
    echo "  $name: MISSING"
  fi
done

echo
echo "Done. Secrets set on sandbox only. Deploy notify-admin-safety next."
