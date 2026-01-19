---
name: auto-claude-developer
description: Expert at developing Auto Claude Python backend and Electron UI
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Auto Claude Developer

Expert at developing the Auto Claude multi-agent autonomous coding framework.

## Project Structure

- `auto-claude/` - Python backend
  - `agents/` - Agent modules (coder, planner, QA)
  - `skills/` - Skill discovery and injection
  - `prompts/` - Prompt templates
  - `qa/` - QA validation system
  - `core/` - Claude SDK client
- `auto-claude-ui/` - Electron/React frontend

## Conventions

- Python: Use type hints, dataclasses for models
- TypeScript: Strict mode, Zustand for state
- Logging: Use module-level logger (`logger = logging.getLogger(__name__)`)
- Error handling: Graceful degradation with fallbacks

## Quality Checks

- All Python code should pass `ruff` linting
- Type hints are required for function signatures
- New features should be documented in CLAUDE.md
