#!/bin/bash
# Ralph Loop Setup Script
# Creates state file for in-session Ralph loop

set -euo pipefail

# Parse arguments
PROMPT_PARTS=()
MAX_ITERATIONS=0
COMPLETION_PROMISE="null"

# Parse options and positional arguments
while [[ $# -gt 0 ]]; do
  case $1 in
  -h|--help)
    cat <<'HELP_EOF'
Ralph Loop - Interactive self-referential development loop

USAGE:
  /ralph-loop [PROMPT...] [OPTIONS]

ARGUMENTS:
  PROMPT...                     Initial prompt to start the loop

OPTIONS:
  --max-iterations <n>          Maximum iterations before auto-stop (default: unlimited)
  --completion-promise '<text>' Promise phrase (USE QUOTES for multi-word)
  -h, --help                    Show this help message

DESCRIPTION:
  Starts a Ralph Wiggum loop in your CURRENT session. The stop hook prevents
  exit and feeds your output back as input until completion or iteration limit.

  To signal completion, output: <promise>YOUR_PHRASE</promise>

EXAMPLES:
  /ralph-loop Build a todo API --completion-promise 'DONE' --max-iterations 20
  /ralph-loop --max-iterations 10 Fix the auth bug
  /ralph-loop Refactor cache layer (runs forever)

STOPPING:
  Only by reaching --max-iterations or detecting --completion-promise
  No manual stop - Ralph runs infinitely by default!

MONITORING:
  # View current iteration:
  grep '^iteration:' .claude/ralph-loop.local.md

  # View full state:
  head -10 .claude/ralph-loop.local.md
HELP_EOF
    exit 0
    ;;
  --max-iterations)
    if [[ -z "${2:-}" ]]; then
      echo "Error: --max-iterations requires a number argument" >&2
      exit 1
    fi
    if ! [[ "$2" =~ ^[0-9]+$ ]]; then
      echo "Error: --max-iterations must be a positive integer or 0, got: $2" >&2
      exit 1
    fi
    MAX_ITERATIONS="$2"
    shift 2
    ;;
  --completion-promise)
    if [[ -z "${2:-}" ]]; then
      echo "Error: --completion-promise requires a text argument" >&2
      exit 1
    fi
    COMPLETION_PROMISE="$2"
    shift 2
    ;;
  *)
    # Non-option argument - collect all as prompt parts
    PROMPT_PARTS+=("$1")
    shift
    ;;
  esac
done

# Join all prompt parts with spaces
PROMPT="${PROMPT_PARTS[*]}"

# Validate prompt is non-empty
if [[ -z "$PROMPT" ]]; then
  echo "Error: No prompt provided" >&2
  echo "" >&2
  echo "Examples:" >&2
  echo "  /ralph-loop Build a REST API for todos" >&2
  echo "  /ralph-loop Fix the auth bug --max-iterations 20" >&2
  exit 1
fi

# Create state file for stop hook (markdown with YAML frontmatter)
mkdir -p .claude

# Quote completion promise for YAML if it contains special chars or is not null
if [[ -n "$COMPLETION_PROMISE" ]] && [[ "$COMPLETION_PROMISE" != "null" ]]; then
  COMPLETION_PROMISE_YAML="\"$COMPLETION_PROMISE\""
else
  COMPLETION_PROMISE_YAML="null"
fi

cat > .claude/ralph-loop.local.md <<EOF
---
active: true
iteration: 1
max_iterations: $MAX_ITERATIONS
completion_promise: $COMPLETION_PROMISE_YAML
started_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
---

$PROMPT
EOF

# Output setup message
echo "Ralph loop activated!"
echo ""
echo "Iteration: 1"
if [[ $MAX_ITERATIONS -gt 0 ]]; then
  echo "Max iterations: $MAX_ITERATIONS"
else
  echo "Max iterations: unlimited"
fi
if [[ "$COMPLETION_PROMISE" != "null" ]]; then
  echo "Completion promise: $COMPLETION_PROMISE"
  echo ""
  echo "To complete, output: <promise>$COMPLETION_PROMISE</promise>"
  echo "ONLY output this when the statement is completely TRUE."
else
  echo "Completion promise: none (runs until max iterations)"
fi
echo ""
echo "Task: $PROMPT"
echo ""
echo "Starting work..."
