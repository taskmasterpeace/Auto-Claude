#!/bin/bash
# Ralph Wiggum Stop Hook
# Intercepts session exits and re-feeds the prompt for loop continuation

set -euo pipefail

STATE_FILE=".claude/ralph-loop.local.md"

# Check if Ralph loop is active
if [[ ! -f "$STATE_FILE" ]]; then
  # No active loop, allow normal exit
  exit 0
fi

# Read state from YAML frontmatter
read_yaml_field() {
  local field="$1"
  grep "^${field}:" "$STATE_FILE" | head -1 | sed 's/^[^:]*: *//' | tr -d '"'
}

ACTIVE=$(read_yaml_field "active")
ITERATION=$(read_yaml_field "iteration")
MAX_ITERATIONS=$(read_yaml_field "max_iterations")
COMPLETION_PROMISE=$(read_yaml_field "completion_promise")

# If not active, allow exit
if [[ "$ACTIVE" != "true" ]]; then
  exit 0
fi

# Check max iterations
if [[ "$MAX_ITERATIONS" -gt 0 ]] && [[ "$ITERATION" -ge "$MAX_ITERATIONS" ]]; then
  echo "Ralph loop reached max iterations ($MAX_ITERATIONS). Exiting."
  rm -f "$STATE_FILE"
  exit 0
fi

# Check for completion promise in transcript (if set)
if [[ -n "$COMPLETION_PROMISE" ]] && [[ "$COMPLETION_PROMISE" != "null" ]]; then
  # Read the transcript to check for promise
  TRANSCRIPT_FILE="${CLAUDE_TRANSCRIPT_PATH:-}"
  if [[ -n "$TRANSCRIPT_FILE" ]] && [[ -f "$TRANSCRIPT_FILE" ]]; then
    # Look for <promise>PHRASE</promise> in the last assistant message
    LAST_RESPONSE=$(tail -100 "$TRANSCRIPT_FILE" 2>/dev/null | grep -o "<promise>[^<]*</promise>" | tail -1 || true)
    if [[ -n "$LAST_RESPONSE" ]]; then
      PROMISE_TEXT=$(echo "$LAST_RESPONSE" | sed 's/<promise>//;s/<\/promise>//')
      if [[ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ]]; then
        echo "Ralph loop completed! Promise fulfilled: $COMPLETION_PROMISE"
        rm -f "$STATE_FILE"
        exit 0
      fi
    fi
  fi
fi

# Increment iteration
NEW_ITERATION=$((ITERATION + 1))

# Extract prompt (everything after the YAML frontmatter)
PROMPT=$(sed -n '/^---$/,/^---$/d; p' "$STATE_FILE")

# Update state file with new iteration
TMP_FILE=$(mktemp)
cat > "$TMP_FILE" <<EOF
---
active: true
iteration: $NEW_ITERATION
max_iterations: $MAX_ITERATIONS
completion_promise: $(if [[ "$COMPLETION_PROMISE" != "null" ]]; then echo "\"$COMPLETION_PROMISE\""; else echo "null"; fi)
started_at: "$(read_yaml_field "started_at")"
---

$PROMPT
EOF
mv "$TMP_FILE" "$STATE_FILE"

# Output continuation message and re-inject prompt
echo ""
echo "========================================"
echo "Ralph Loop - Iteration $NEW_ITERATION"
if [[ "$MAX_ITERATIONS" -gt 0 ]]; then
  echo "Progress: $NEW_ITERATION / $MAX_ITERATIONS"
fi
echo "========================================"
echo ""

# Create the response that will be fed back
# This uses Claude Code's hook response format to inject a new user message
cat <<EOF
{
  "decision": "block",
  "reason": "Ralph loop continuing",
  "message": "Iteration $NEW_ITERATION: $PROMPT"
}
EOF
