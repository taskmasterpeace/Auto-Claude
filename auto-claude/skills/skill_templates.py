"""
Skill Template Generator
========================

Uses Claude to generate high-quality, project-specific SKILL.md templates
by analyzing actual code files and understanding project patterns.
"""

import logging
import os
from pathlib import Path
from typing import Literal

try:
    import anthropic
except ImportError:
    anthropic = None

logger = logging.getLogger(__name__)


class SkillTemplateGenerator:
    """Generate contextual skill templates using Claude."""

    def __init__(self, project_dir: Path):
        self.project_dir = Path(project_dir).resolve()
        self._client = None

    def _get_client(self):
        """Lazy-load Anthropic client."""
        if self._client is not None:
            return self._client

        if anthropic is None:
            raise ImportError(
                "anthropic package not installed. Run: pip install anthropic"
            )

        # Try Claude Code OAuth token first, then Anthropic API key
        api_key = os.environ.get("CLAUDE_CODE_OAUTH_TOKEN") or os.environ.get(
            "ANTHROPIC_API_KEY"
        )

        if not api_key:
            raise ValueError(
                "No API key found. Set CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY"
            )

        self._client = anthropic.Anthropic(api_key=api_key)
        return self._client

    def _read_example_files(
        self, file_paths: list[str], max_files: int = 3, max_chars: int = 2000
    ) -> str:
        """Read example files to provide context."""
        examples = []

        for file_path in file_paths[:max_files]:
            full_path = self.project_dir / file_path

            if not full_path.exists():
                continue

            try:
                content = full_path.read_text(encoding="utf-8")

                # Truncate if too long
                if len(content) > max_chars:
                    content = content[:max_chars] + "\n... (truncated)"

                examples.append(f"### {file_path}\n```\n{content}\n```")
            except Exception as e:
                logger.debug(f"Could not read {file_path}: {e}")
                continue

        if not examples:
            return "No example files available."

        return "\n\n".join(examples)

    def generate_template(
        self,
        skill_name: str,
        skill_description: str,
        category: Literal[
            "framework", "testing", "deployment", "security", "patterns", "database"
        ],
        tech_stack: list[str],
        relevant_files: list[str],
        reasoning: str,
    ) -> str:
        """
        Generate a project-specific SKILL.md template using Claude.

        Args:
            skill_name: Name of the skill (e.g., "react-component-developer")
            skill_description: Brief description of what the skill does
            category: Skill category
            tech_stack: Technologies involved (e.g., ["react", "typescript"])
            relevant_files: Files that inform this skill
            reasoning: Why this skill was suggested

        Returns:
            Complete SKILL.md content with YAML frontmatter
        """
        # Read example files for context
        examples = self._read_example_files(relevant_files)

        # Build the prompt
        prompt = f"""You are an expert at creating Claude Code SKILL.md files. Generate a high-quality, project-specific skill that teaches an AI agent how to work with this codebase.

**Skill Information:**
- Name: {skill_name}
- Description: {skill_description}
- Category: {category}
- Tech Stack: {', '.join(tech_stack)}
- Reasoning: {reasoning}

**Project Code Examples:**
{examples}

**Requirements:**

1. **YAML Frontmatter** - Must include:
   - name: {skill_name}
   - description: {skill_description}
   - allowed-tools: List of relevant tools (Read, Write, Edit, Bash, Grep, Glob)

2. **Skill Content** - Include:
   - Clear introduction explaining the skill's purpose
   - **Project-Specific Conventions** section based on the code examples
   - Detected patterns (naming, structure, testing, error handling)
   - **Responsibilities** section with specific tasks
   - **Quality Checks** section with validation steps
   - **Common Gotchas** section if applicable

3. **Tone:**
   - Be specific to THIS project, not generic advice
   - Reference actual patterns from the code examples
   - Use imperative language ("Create", "Ensure", "Use", not "You should")
   - Keep it concise and actionable

**Format:**
```
---
name: {skill_name}
description: {skill_description}
allowed-tools: Tool1, Tool2, Tool3
---

# Skill Title

Introduction paragraph.

## Project Conventions

Based on analysis of this codebase:
- Convention 1 from examples
- Convention 2 from examples
- ...

## Responsibilities

1. Specific task 1
2. Specific task 2
...

## Quality Checks

- Check 1
- Check 2
...
```

Generate the complete SKILL.md file now:"""

        try:
            client = self._get_client()

            # Call Claude API
            response = client.messages.create(
                model="claude-sonnet-4-20250514",  # Latest Sonnet
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )

            # Extract the text content
            template = response.content[0].text

            # Ensure it has YAML frontmatter
            if not template.strip().startswith("---"):
                logger.warning(
                    "Generated template missing YAML frontmatter, adding it"
                )
                template = self._add_frontmatter(
                    template, skill_name, skill_description
                )

            return template

        except Exception as e:
            logger.error(f"Failed to generate template with Claude: {e}")
            # Fallback to basic template
            return self._generate_fallback_template(
                skill_name, skill_description, category, tech_stack
            )

    def _add_frontmatter(
        self, content: str, skill_name: str, skill_description: str
    ) -> str:
        """Add YAML frontmatter if missing."""
        frontmatter = f"""---
name: {skill_name}
description: {skill_description}
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

"""
        return frontmatter + content

    def _generate_fallback_template(
        self,
        skill_name: str,
        skill_description: str,
        category: str,
        tech_stack: list[str],
    ) -> str:
        """Generate a basic template when Claude API is unavailable."""
        return f"""---
name: {skill_name}
description: {skill_description}
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# {skill_name.replace('-', ' ').title()}

{skill_description}

## Technologies

This skill covers: {', '.join(tech_stack)}

## Responsibilities

1. Analyze requirements and existing code patterns
2. Implement features following project conventions
3. Ensure code quality and consistency
4. Add appropriate tests and documentation

## Quality Checks

- Code follows project style and conventions
- All tests pass
- Documentation is clear and complete
- No security vulnerabilities introduced

## Getting Started

When using this skill:

1. **Read existing code** to understand patterns
2. **Follow conventions** observed in the codebase
3. **Test thoroughly** before considering work complete
4. **Document** any non-obvious implementation details

---

**Note:** This is a basic template. For better results, ensure Claude API access is configured.
"""


# Convenience function for skill_discovery.py
def generate_skill_template(
    project_dir: Path,
    skill_name: str,
    skill_description: str,
    category: Literal[
        "framework", "testing", "deployment", "security", "patterns", "database"
    ],
    tech_stack: list[str],
    relevant_files: list[str],
    reasoning: str,
) -> str:
    """
    Generate a skill template. Wrapper around SkillTemplateGenerator.

    Returns:
        Complete SKILL.md content
    """
    generator = SkillTemplateGenerator(project_dir)
    return generator.generate_template(
        skill_name=skill_name,
        skill_description=skill_description,
        category=category,
        tech_stack=tech_stack,
        relevant_files=relevant_files,
        reasoning=reasoning,
    )
