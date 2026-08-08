#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-yesi3/soroban-rpc-chaos-kit}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${ROOT}/docs/WAVE_ISSUES.md"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/soroban-wave-issues.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

command -v gh >/dev/null 2>&1 || { printf 'error: gh is required\n' >&2; exit 1; }
[[ -f "$SOURCE" ]] || { printf 'error: missing %s\n' "$SOURCE" >&2; exit 1; }

for label in \
  "wave|Drips Wave contribution candidate|#8250DF" \
  "complexity:trivial|Small, focused task|#C5DEF5" \
  "complexity:medium|Moderate implementation task|#FBCA04" \
  "complexity:high|Complex design or implementation task|#D93F0B"; do
  IFS='|' read -r name description color <<<"$label"
  gh label create "$name" --repo "$REPO" --description "$description" --color "$color" --force >/dev/null
done

# Split only explicitly delimited issue records. Each record must start with one
# level-three heading and contain a Complexity field.
awk -v dir="$TMP_DIR" '
  /<!-- ISSUE -->/ { if (out) close(out); count++; out=sprintf("%s/issue-%02d.md", dir, count); next }
  out { print > out }
  END { if (out) close(out); if (count != 36) exit 36 }
' "$SOURCE" || {
  printf 'error: expected exactly 36 issue records in %s\n' "$SOURCE" >&2
  exit 1
}

TITLES="$TMP_DIR/existing-titles.txt"
gh issue list --repo "$REPO" --state all --limit 1000 --json title --jq '.[].title' >"$TITLES"

issue_exists() {
  local wanted="$1" existing
  while IFS= read -r existing; do
    [[ "$existing" == "$wanted" ]] && return 0
  done <"$TITLES"
  return 1
}

created=0
skipped=0
for record in "$TMP_DIR"/issue-*.md; do
  title="$(awk '/^### / { sub(/^### /, ""); print; exit }' "$record")"
  complexity="$(awk '/^\*\*Complexity:\*\*/ { sub(/^\*\*Complexity:\*\*[[:space:]]*/, ""); print; exit }' "$record")"
  [[ -n "$title" && "$complexity" =~ ^(trivial|medium|high)$ ]] || {
    printf 'error: malformed issue record %s\n' "$record" >&2
    exit 1
  }

  if issue_exists "$title"; then
    printf 'skip: %s\n' "$title"
    skipped=$((skipped + 1))
    continue
  fi

  body="$TMP_DIR/body.md"
  awk 'found { print } /^### / { found=1; next }' "$record" >"$body"
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body-file "$body" \
    --label "wave" \
    --label "complexity:$complexity"
  printf '%s\n' "$title" >>"$TITLES"
  created=$((created + 1))
done

printf 'done: created=%d skipped=%d repo=%s\n' "$created" "$skipped" "$REPO"
