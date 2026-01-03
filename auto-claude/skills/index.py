"""
Skill Index Management
======================

Provides filtered skill indices based on project tech stack.
Implements Layer 1 of the progressive disclosure pattern.
"""

import json
import logging
from dataclasses import dataclass
from pathlib import Path

from .library import SkillLibrary, SkillMeta

logger = logging.getLogger(__name__)


@dataclass
class ProjectTechStack:
    """Detected tech stack for a project."""

    languages: list[str]
    frameworks: list[str]
    tools: list[str]

    def as_list(self) -> list[str]:
        """Return all tech as a single list."""
        return self.languages + self.frameworks + self.tools


def detect_project_tech_stack(project_dir: Path) -> ProjectTechStack:
    """
    Detect the technology stack of a project.

    Args:
        project_dir: Root directory of the project

    Returns:
        Detected ProjectTechStack
    """
    project_path = Path(project_dir).resolve()
    languages: list[str] = []
    frameworks: list[str] = []
    tools: list[str] = []

    # Check for Python
    if (project_path / "requirements.txt").exists() or (project_path / "pyproject.toml").exists():
        languages.append("python")
        # Check for common Python frameworks
        for req_file in ["requirements.txt", "pyproject.toml", "setup.py"]:
            req_path = project_path / req_file
            if req_path.exists():
                try:
                    content = req_path.read_text(encoding="utf-8").lower()
                    if "django" in content:
                        frameworks.append("django")
                    if "flask" in content:
                        frameworks.append("flask")
                    if "fastapi" in content:
                        frameworks.append("fastapi")
                    if "pytest" in content:
                        tools.append("pytest")
                except Exception:
                    pass

    # Check for JavaScript/TypeScript
    if (project_path / "package.json").exists():
        languages.append("javascript")
        try:
            pkg = json.loads((project_path / "package.json").read_text(encoding="utf-8"))
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

            if "typescript" in deps:
                languages.append("typescript")
            if "react" in deps or "@types/react" in deps:
                frameworks.append("react")
            if "vue" in deps:
                frameworks.append("vue")
            if "next" in deps:
                frameworks.append("nextjs")
            if "express" in deps:
                frameworks.append("express")
            if "jest" in deps or "@types/jest" in deps:
                tools.append("jest")
            if "electron" in deps:
                frameworks.append("electron")
            if "vite" in deps:
                tools.append("vite")
        except Exception:
            pass

    # Check for Go
    if (project_path / "go.mod").exists():
        languages.append("go")

    # Check for Rust
    if (project_path / "Cargo.toml").exists():
        languages.append("rust")

    # Check for Ruby
    if (project_path / "Gemfile").exists():
        languages.append("ruby")
        try:
            content = (project_path / "Gemfile").read_text(encoding="utf-8").lower()
            if "rails" in content:
                frameworks.append("rails")
        except Exception:
            pass

    # Check for Java
    if (project_path / "pom.xml").exists() or (project_path / "build.gradle").exists():
        languages.append("java")
        if (project_path / "build.gradle").exists():
            tools.append("gradle")

    # Check for .NET
    if any(project_path.glob("*.csproj")):
        languages.append("csharp")
        frameworks.append("dotnet")

    # Check for Docker
    if (project_path / "Dockerfile").exists() or (project_path / "docker-compose.yml").exists():
        tools.append("docker")

    # Check for common configs
    if (project_path / ".github").is_dir():
        tools.append("github-actions")

    if (project_path / "terraform").is_dir() or any(project_path.glob("*.tf")):
        tools.append("terraform")

    # Deduplicate while preserving order
    def dedupe(lst: list[str]) -> list[str]:
        seen = set()
        result = []
        for item in lst:
            if item not in seen:
                seen.add(item)
                result.append(item)
        return result

    return ProjectTechStack(
        languages=dedupe(languages),
        frameworks=dedupe(frameworks),
        tools=dedupe(tools),
    )


class SkillIndex:
    """
    Provides filtered skill indices for agent prompts.

    Implements Layer 1 of progressive disclosure:
    - Only skill name + description injected (~200 tokens for 10-15 skills)
    - Full SKILL.md loaded on-demand by agent
    """

    def __init__(self, project_dir: Path | None = None):
        """
        Initialize skill index.

        Args:
            project_dir: Project directory for tech stack detection
        """
        self.project_dir = Path(project_dir).resolve() if project_dir else None
        self.library = SkillLibrary()

        # Detect tech stack if project provided
        if self.project_dir:
            self.tech_stack = detect_project_tech_stack(self.project_dir)
        else:
            self.tech_stack = ProjectTechStack([], [], [])

    def get_relevant_skills(self, max_skills: int = 15) -> list[SkillMeta]:
        """
        Get skills relevant to this project's tech stack.

        Args:
            max_skills: Maximum number of skills to return

        Returns:
            Filtered list of skill metadata
        """
        tech_list = self.tech_stack.as_list()
        return self.library.filter_by_tech_stack(tech_list, max_skills)

    def format_skill_index(
        self,
        skills: list[SkillMeta] | None = None,
        max_skills: int = 15,
    ) -> str:
        """
        Format skill index for injection into agent prompt.

        Args:
            skills: Pre-filtered skills (or None to auto-filter)
            max_skills: Maximum skills if auto-filtering

        Returns:
            Formatted string for prompt injection (~200 tokens)
        """
        if skills is None:
            skills = self.get_relevant_skills(max_skills)

        if not skills:
            return ""

        lines = [
            "## Available Skills",
            "",
            "The following skills are available from the skill library.",
            "To use a skill, read its full instructions with: Read .claude/skill-library/{path}",
            "",
        ]

        for skill in skills:
            # Keep description short (max 80 chars)
            desc = skill.description[:80]
            if len(skill.description) > 80:
                desc = desc[:77] + "..."

            lines.append(f"- **{skill.name}**: {desc}")
            lines.append(f"  Path: `.claude/skill-library/{skill.path}`")

        return "\n".join(lines)

    def get_context_for_agent(
        self,
        agent_type: str,
        max_skills: int = 10,
    ) -> str:
        """
        Get skill index context for a specific agent type.

        Different agents may prefer different skill subsets.

        Args:
            agent_type: Type of agent (planner, coder, qa_reviewer, qa_fixer)
            max_skills: Maximum number of skills to include

        Returns:
            Formatted skill index string
        """
        # Agent-specific preferences
        agent_preferences = {
            "planner": ["architecture", "design", "planning"],
            "coder": ["development", "testing", "web", "data"],
            "qa_reviewer": ["testing", "security", "validation"],
            "qa_fixer": ["debugging", "testing", "development"],
        }

        # Get all relevant skills
        all_skills = self.get_relevant_skills(max_skills * 2)

        # Filter by agent preferences if any match
        preferences = agent_preferences.get(agent_type, [])
        if preferences:
            preferred_skills = []
            other_skills = []

            for skill in all_skills:
                skill_tags = [t.lower() for t in skill.tags]
                skill_name = skill.name.lower()

                is_preferred = any(
                    pref in tag or pref in skill_name for pref in preferences for tag in skill_tags
                )

                if is_preferred:
                    preferred_skills.append(skill)
                else:
                    other_skills.append(skill)

            # Combine: preferred first, then others
            filtered = (preferred_skills + other_skills)[:max_skills]
        else:
            filtered = all_skills[:max_skills]

        return self.format_skill_index(filtered)


def get_skill_index(project_dir: Path | None = None) -> SkillIndex:
    """
    Get a SkillIndex instance.

    Args:
        project_dir: Project directory for tech stack detection

    Returns:
        SkillIndex instance
    """
    return SkillIndex(project_dir)
