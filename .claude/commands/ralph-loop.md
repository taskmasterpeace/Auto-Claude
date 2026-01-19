---
description: Start an autonomous Ralph Wiggum development loop
allowed-tools: Bash
argument-hint: [prompt] [--max-iterations N] [--completion-promise "TEXT"]
---

# Ralph Loop

Start an autonomous development loop that iterates until completion.

## Execute Setup Script

Run this command with the provided arguments:

```bash
bash .claude/scripts/setup-ralph-loop.sh $ARGUMENTS
```

## How It Works

1. The setup script creates a state file at `.claude/ralph-loop.local.md`
2. The Stop hook intercepts exit attempts and re-feeds the prompt
3. Each iteration sees modified files and git history from previous runs
4. Loop continues until max iterations or completion promise is detected

## Parameters

- `prompt` - The task to work on iteratively
- `--max-iterations N` - Maximum iterations before auto-stop (default: unlimited)
- `--completion-promise "TEXT"` - Promise phrase to signal completion

## Examples

```
/ralph-loop Build a REST API for todos --max-iterations 20
/ralph-loop Fix all TypeScript errors --completion-promise "All errors fixed"
```

## Completion

When using `--completion-promise`, output `<promise>YOUR_PHRASE</promise>` ONLY when the statement is completely and unequivocally TRUE. Do not lie to exit the loop.

After running the setup script, begin working on the task immediately.
