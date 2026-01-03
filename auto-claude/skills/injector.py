"""
Skill Injector
==============

Implements progressive disclosure for skills:
1. Project skills (.claude/skills/) - Full content, always loaded
2. Library skills (.claude/skill-library/) - Index only, agent reads on-demand

This keeps context usage low while giving agents access to 250+ skills.
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

logger = logging.getLogger(__name__)


@dataclass
class Skill:
    """A loaded skill from .claude/skills/"""

    name: str
    description: str
    allowed_tools: list[str]
    content: str  # Full SKILL.md content (without frontmatter)
    path: Path


# Agent type to skill pattern mapping
# Each agent type gets skills matching these patterns
AGENT_SKILL_PATTERNS: dict[str, list[str]] = {
    "planner": ["architect", "developer", "design"],
    "coder": ["developer", "specialist", "writer", "engineer"],
    "qa_reviewer": ["test", "security", "quality", "validation"],
    "qa_fixer": ["developer", "test", "debug", "fix"],
}


def parse_skill_frontmatter(content: str) -> tuple[dict, str]:
    """
    Parse YAML frontmatter from a SKILL.md file.

    Args:
        content: Full SKILL.md file content

    Returns:
        Tuple of (frontmatter dict, remaining content)
    """
    frontmatter = {}
    body = content

    # Check for YAML frontmatter (--- delimited)
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            yaml_content = parts[1].strip()
            body = parts[2].strip()

            # Simple YAML parsing (key: value lines)
            for line in yaml_content.split("\n"):
                line = line.strip()
                if ":" in line:
                    key, value = line.split(":", 1)
                    key = key.strip()
                    value = value.strip()

                    # Handle comma-separated lists
                    if "," in value:
                        value = [v.strip() for v in value.split(",")]

                    frontmatter[key] = value

    return frontmatter, body


def load_skill(skill_dir: Path) -> Skill | None:
    """
    Load a single skill from a directory.

    Args:
        skill_dir: Directory containing SKILL.md

    Returns:
        Skill object or None if invalid
    """
    skill_file = skill_dir / "SKILL.md"

    if not skill_file.exists():
        return None

    try:
        content = skill_file.read_text(encoding="utf-8")
        frontmatter, body = parse_skill_frontmatter(content)

        name = frontmatter.get("name", skill_dir.name)
        description = frontmatter.get("description", "")
        allowed_tools = frontmatter.get("allowed-tools", [])

        if isinstance(allowed_tools, str):
            allowed_tools = [t.strip() for t in allowed_tools.split(",")]

        return Skill(
            name=name,
            description=description,
            allowed_tools=allowed_tools,
            content=body,
            path=skill_file,
        )
    except Exception as e:
        logger.warning(f"Failed to load skill from {skill_dir}: {e}")
        return None


class SkillInjector:
    """
    Loads and injects skills into agent prompts.

    Skills are loaded from .claude/skills/ in the project directory.
    They are matched to agent types based on name patterns.
    """

    def __init__(self, project_dir: Path):
        """
        Initialize the skill injector.

        Args:
            project_dir: Root project directory
        """
        self.project_dir = Path(project_dir).resolve()
        self.skills_dir = self.project_dir / ".claude" / "skills"
        self._skills_cache: list[Skill] | None = None

    def load_all_skills(self) -> list[Skill]:
        """
        Load all skills from .claude/skills/.

        Returns:
            List of loaded Skill objects
        """
        if self._skills_cache is not None:
            return self._skills_cache

        skills = []

        if not self.skills_dir.exists():
            logger.debug(f"No skills directory at {self.skills_dir}")
            self._skills_cache = skills
            return skills

        # Each subdirectory is a skill
        for skill_dir in self.skills_dir.iterdir():
            if skill_dir.is_dir():
                skill = load_skill(skill_dir)
                if skill:
                    skills.append(skill)
                    logger.debug(f"Loaded skill: {skill.name}")

        logger.info(f"Loaded {len(skills)} skills from {self.skills_dir}")
        self._skills_cache = skills
        return skills

    def match_skills_for_agent(
        self,
        agent_type: Literal["planner", "coder", "qa_reviewer", "qa_fixer"],
    ) -> list[Skill]:
        """
        Get skills relevant to a specific agent type.

        Skills are matched by checking if the skill name contains
        any of the patterns for that agent type.

        Args:
            agent_type: Type of agent (planner, coder, qa_reviewer, qa_fixer)

        Returns:
            List of matching skills
        """
        all_skills = self.load_all_skills()
        patterns = AGENT_SKILL_PATTERNS.get(agent_type, [])

        if not patterns:
            return all_skills  # Return all if no pattern defined

        matched = []
        for skill in all_skills:
            skill_name_lower = skill.name.lower()
            for pattern in patterns:
                if pattern.lower() in skill_name_lower:
                    matched.append(skill)
                    break

        logger.debug(
            f"Matched {len(matched)}/{len(all_skills)} skills for agent type '{agent_type}'"
        )
        return matched

    def format_for_injection(
        self,
        skills: list[Skill],
        include_full_content: bool = True,
        max_skills: int = 3,
    ) -> str:
        """
        Format skills for injection into a prompt.

        Args:
            skills: List of skills to format
            include_full_content: Whether to include full skill content
            max_skills: Maximum number of skills to include

        Returns:
            Formatted markdown string for injection
        """
        if not skills:
            return ""

        # Limit skills to avoid context bloat
        skills_to_include = skills[:max_skills]

        sections = [
            "## Available Project Skills",
            "",
            "The following skills describe project-specific patterns and conventions.",
            "Consider using them if relevant to your current task:",
            "",
        ]

        for skill in skills_to_include:
            sections.append(f"### {skill.name}")
            if skill.description:
                sections.append(f"*{skill.description}*")
            sections.append("")

            if include_full_content and skill.content:
                # Include skill content but limit size
                content = skill.content
                if len(content) > 2000:
                    content = content[:2000] + "\n\n... (truncated)"
                sections.append(content)
            sections.append("")

        sections.append("---")
        sections.append("")
        sections.append(
            "*Note: Use these skills as guidance when they help achieve the task.*"
        )
        sections.append("")

        return "\n".join(sections)

    def get_context_for_agent(
        self,
        agent_type: Literal["planner", "coder", "qa_reviewer", "qa_fixer"],
    ) -> str:
        """
        Get formatted skill context for an agent.

        This is the main entry point for skill injection.

        Args:
            agent_type: Type of agent requesting context

        Returns:
            Formatted skill context string (empty if no relevant skills)
        """
        matched_skills = self.match_skills_for_agent(agent_type)
        if not matched_skills:
            return ""

        return self.format_for_injection(matched_skills)


def get_skill_context(
    project_dir: Path,
    agent_type: Literal["planner", "coder", "qa_reviewer", "qa_fixer"],
) -> str:
    """
    Get skill context for an agent using user-curated skill selection.

    Combines two sources:
    1. Project skills (.claude/skills/) - Full content, always included
    2. Enabled library skills - Only skills user explicitly enabled

    Args:
        project_dir: Root project directory
        agent_type: Type of agent

    Returns:
        Formatted skill context string
    """
    sections = []

    # 1. Project-specific skills (full content - always included)
    injector = SkillInjector(project_dir)
    project_context = injector.get_context_for_agent(agent_type)
    if project_context:
        sections.append(project_context)

    # 2. User-enabled library skills (index only)
    try:
        from .config import load_enabled_skills
        from .library import SkillLibrary

        enabled = load_enabled_skills(project_dir)

        if enabled:
            library = SkillLibrary()
            all_skills = library.list_skills()

            # Filter to only enabled skills
            enabled_skills = [s for s in all_skills if f"{s.source}/{s.name}" in enabled]

            if enabled_skills:
                # Format as index (name + description + path)
                lines = [
                    "## Enabled Skills",
                    "",
                    "The following skills are enabled for this project.",
                    "Read the full skill file for detailed instructions:",
                    "",
                ]

                for skill in enabled_skills:
                    desc = skill.description[:80]
                    if len(skill.description) > 80:
                        desc = desc[:77] + "..."
                    lines.append(f"- **{skill.name}**: {desc}")
                    lines.append(f"  Path: `.claude/skill-library/{skill.path}`")

                sections.append("\n".join(lines))
                logger.info(f"Injected {len(enabled_skills)} enabled library skills")

    except ImportError as e:
        logger.debug(f"Skill config not available: {e}")
    except Exception as e:
        logger.warning(f"Failed to load enabled skills: {e}")

    if not sections:
        return ""

    return "\n\n".join(sections)
