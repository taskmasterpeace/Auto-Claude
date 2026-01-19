---
description: Cancel an active Ralph Wiggum development loop
allowed-tools: Bash, Read
---

# Cancel Ralph Loop

Cancel an active Ralph Wiggum development loop.

## Steps

1. Check if the loop is active:
```bash
test -f .claude/ralph-loop.local.md && echo "EXISTS" || echo "NOT_FOUND"
```

2. If **NOT_FOUND**: Report "No active Ralph loop found."

3. If **EXISTS**:
   - Read `.claude/ralph-loop.local.md` to get the iteration number
   - Remove the state file:
   ```bash
   rm .claude/ralph-loop.local.md
   ```
   - Report: "Cancelled Ralph loop (was at iteration N)"
