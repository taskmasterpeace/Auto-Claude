"""
Skill Library Manager
=====================

Downloads and manages skills from external repositories.
Stores them locally in .claude/skill-library/ for offline use.
"""

import json
import logging
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class SkillSource:
    """A source repository for skills."""

    name: str
    url: str
    branch: str = "main"
    subdirectory: str = ""  # If skills are in a subdirectory


# Known skill sources
SKILL_SOURCES: list[SkillSource] = [
    SkillSource(
        name="anthropic",
        url="https://github.com/anthropics/skills.git",
        branch="main",
        subdirectory="skills",
    ),
    SkillSource(
        name="k-dense-scientific",
        url="https://github.com/K-Dense-AI/claude-scientific-skills.git",
        branch="main",
        subdirectory="scientific-skills",
    ),
]


# Skill categories for UI organization
SKILL_CATEGORIES = {
    "documents": ["pdf", "docx", "xlsx", "pptx", "doc"],
    "development": ["mcp", "webapp", "frontend", "backend", "testing", "builder", "creator"],
    "design": ["design", "art", "canvas", "theme", "brand", "visual"],
    "communication": ["comms", "slack", "internal", "email"],
    "scientific": [],  # Will match k-dense-scientific source
}


def infer_category(name: str, source: str, tags: list[str]) -> str:
    """Infer skill category from name, source, and tags."""
    name_lower = name.lower()

    # K-Dense skills are all scientific
    if source == "k-dense-scientific":
        return "scientific"

    # Check category keywords
    for category, keywords in SKILL_CATEGORIES.items():
        for keyword in keywords:
            if keyword in name_lower:
                return category
            for tag in tags:
                if keyword in tag.lower():
                    return category

    # Default based on source
    if source == "anthropic":
        return "development"

    return "other"


@dataclass
class SkillMeta:
    """Metadata for a skill (minimal, for index)."""

    name: str
    description: str
    source: str
    path: str  # Relative path from skill-library/
    tags: list[str] = field(default_factory=list)
    tech_stack: list[str] = field(default_factory=list)
    category: str = ""  # Inferred category for UI grouping

    def __post_init__(self):
        """Infer category if not set."""
        if not self.category:
            self.category = infer_category(self.name, self.source, self.tags)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "name": self.name,
            "description": self.description,
            "source": self.source,
            "path": self.path,
            "tags": self.tags,
            "tech_stack": self.tech_stack,
            "category": self.category,
        }


class SkillLibrary:
    """
    Manages the local skill library.

    Skills are stored in .claude/skill-library/ with structure:
    .claude/skill-library/
    ├── anthropic/
    │   ├── pdf/SKILL.md
    │   ├── xlsx/SKILL.md
    │   └── ...
    ├── k-dense-scientific/
    │   ├── research-assistant/SKILL.md
    │   └── ...
    └── index.json
    """

    def __init__(self, project_dir: Path | None = None):
        """
        Initialize skill library.

        Args:
            project_dir: Project directory (defaults to current directory)
        """
        if project_dir is None:
            # Use home directory for global skill library
            self.library_dir = Path.home() / ".claude" / "skill-library"
        else:
            # Project-specific library (can symlink to global)
            self.library_dir = Path(project_dir) / ".claude" / "skill-library"

        self.index_path = self.library_dir / "index.json"

    def ensure_directory(self) -> None:
        """Ensure the skill library directory exists."""
        self.library_dir.mkdir(parents=True, exist_ok=True)

    def download_source(self, source: SkillSource, force: bool = False) -> int:
        """
        Download skills from a source repository.

        Args:
            source: The skill source to download
            force: If True, re-download even if exists

        Returns:
            Number of skills downloaded
        """
        source_dir = self.library_dir / source.name

        if source_dir.exists() and not force:
            logger.info(f"Source {source.name} already exists, skipping (use force=True to re-download)")
            return 0

        logger.info(f"Downloading skills from {source.name}...")

        # Clone to temp directory first
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir) / "repo"

            try:
                # Shallow clone for speed
                subprocess.run(
                    [
                        "git",
                        "clone",
                        "--depth",
                        "1",
                        "--branch",
                        source.branch,
                        source.url,
                        str(tmp_path),
                    ],
                    check=True,
                    capture_output=True,
                    text=True,
                )
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to clone {source.url}: {e.stderr}")
                return 0

            # Find skills directory
            if source.subdirectory:
                skills_path = tmp_path / source.subdirectory
            else:
                skills_path = tmp_path

            if not skills_path.exists():
                logger.error(f"Skills directory not found: {skills_path}")
                return 0

            # Remove old version if forcing
            if source_dir.exists():
                shutil.rmtree(source_dir)

            # Copy skill directories (those containing SKILL.md)
            source_dir.mkdir(parents=True, exist_ok=True)
            skill_count = 0

            for item in skills_path.iterdir():
                if item.is_dir():
                    skill_file = item / "SKILL.md"
                    if skill_file.exists():
                        dest = source_dir / item.name
                        shutil.copytree(item, dest)
                        skill_count += 1
                        logger.debug(f"  Copied skill: {item.name}")

            logger.info(f"Downloaded {skill_count} skills from {source.name}")
            return skill_count

    def download_all(self, force: bool = False) -> dict[str, int]:
        """
        Download skills from all known sources.

        Args:
            force: If True, re-download all sources

        Returns:
            Dict mapping source name to number of skills downloaded
        """
        self.ensure_directory()
        results = {}

        for source in SKILL_SOURCES:
            count = self.download_source(source, force=force)
            results[source.name] = count

        # Rebuild index after downloading
        self.build_index()

        return results

    def parse_skill_metadata(self, skill_path: Path, source_name: str) -> SkillMeta | None:
        """
        Parse metadata from a SKILL.md file.

        Args:
            skill_path: Path to the skill directory
            source_name: Name of the source repository

        Returns:
            SkillMeta or None if parsing failed
        """
        skill_file = skill_path / "SKILL.md"
        if not skill_file.exists():
            return None

        try:
            content = skill_file.read_text(encoding="utf-8")
        except Exception as e:
            logger.warning(f"Failed to read {skill_file}: {e}")
            return None

        # Parse YAML frontmatter
        name = skill_path.name
        description = ""
        tags: list[str] = []
        tech_stack: list[str] = []

        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                frontmatter = parts[1].strip()

                for line in frontmatter.split("\n"):
                    line = line.strip()
                    if line.startswith("name:"):
                        name = line.split(":", 1)[1].strip().strip("'\"")
                    elif line.startswith("description:"):
                        description = line.split(":", 1)[1].strip().strip("'\"")
                    elif line.startswith("tags:"):
                        # Simple inline list parsing
                        tags_str = line.split(":", 1)[1].strip()
                        if tags_str.startswith("["):
                            tags = [t.strip().strip("'\"") for t in tags_str.strip("[]").split(",")]
                    elif line.startswith("tech_stack:") or line.startswith("tech-stack:"):
                        stack_str = line.split(":", 1)[1].strip()
                        if stack_str.startswith("["):
                            tech_stack = [t.strip().strip("'\"") for t in stack_str.strip("[]").split(",")]

        # If no description in frontmatter, use first paragraph after frontmatter
        if not description:
            body = content.split("---", 2)[-1].strip() if content.startswith("---") else content
            lines = body.split("\n")
            for line in lines:
                line = line.strip()
                if line and not line.startswith("#"):
                    description = line[:200]  # First 200 chars
                    break

        # Infer tech stack from content if not specified
        if not tech_stack:
            tech_stack = self._infer_tech_stack(content)

        # Infer tags from name and content if not specified
        if not tags:
            tags = self._infer_tags(name, content)

        relative_path = f"{source_name}/{skill_path.name}/SKILL.md"

        return SkillMeta(
            name=name,
            description=description,
            source=source_name,
            path=relative_path,
            tags=tags,
            tech_stack=tech_stack,
        )

    def _infer_tech_stack(self, content: str) -> list[str]:
        """Infer tech stack from skill content."""
        content_lower = content.lower()
        tech_stack = []

        tech_indicators = {
            "python": ["python", ".py", "pip ", "import "],
            "javascript": ["javascript", "node", ".js", "npm "],
            "typescript": ["typescript", ".ts", ".tsx"],
            "react": ["react", "jsx", "tsx", "component"],
            "vue": ["vue", ".vue"],
            "rust": ["rust", "cargo", ".rs"],
            "go": ["golang", "go mod", ".go"],
            "java": ["java", "maven", "gradle", ".java"],
            "csharp": ["c#", "csharp", ".cs", "dotnet"],
            "ruby": ["ruby", "gem", ".rb"],
            "php": ["php", ".php"],
            "swift": ["swift", ".swift"],
            "kotlin": ["kotlin", ".kt"],
            "sql": ["sql", "postgresql", "mysql", "sqlite"],
        }

        for tech, indicators in tech_indicators.items():
            if any(ind in content_lower for ind in indicators):
                tech_stack.append(tech)

        return tech_stack[:5]  # Limit to 5

    def _infer_tags(self, name: str, content: str) -> list[str]:
        """Infer tags from skill name and content."""
        content_lower = content.lower()
        name_lower = name.lower()
        tags = []

        tag_indicators = {
            "testing": ["test", "spec", "assert", "mock"],
            "web": ["web", "http", "api", "browser"],
            "data": ["data", "database", "csv", "json"],
            "documents": ["pdf", "doc", "xlsx", "document"],
            "ai": ["ml", "ai", "model", "llm"],
            "devops": ["docker", "kubernetes", "ci", "deploy"],
            "security": ["security", "auth", "encrypt"],
            "frontend": ["ui", "component", "css", "style"],
            "backend": ["server", "api", "endpoint"],
            "mobile": ["mobile", "ios", "android"],
        }

        for tag, indicators in tag_indicators.items():
            if any(ind in content_lower or ind in name_lower for ind in indicators):
                tags.append(tag)

        return tags[:5]  # Limit to 5

    def build_index(self) -> dict:
        """
        Build index.json from all downloaded skills.

        Returns:
            The index dictionary
        """
        self.ensure_directory()

        skills: list[dict] = []

        # Scan each source directory
        for source_dir in self.library_dir.iterdir():
            if source_dir.is_dir() and source_dir.name != "index.json":
                source_name = source_dir.name

                for skill_dir in source_dir.iterdir():
                    if skill_dir.is_dir():
                        meta = self.parse_skill_metadata(skill_dir, source_name)
                        if meta:
                            skills.append(meta.to_dict())

        index = {
            "version": "1.0",
            "updated": datetime.now().isoformat(),
            "skill_count": len(skills),
            "skills": skills,
        }

        # Write index
        self.index_path.write_text(json.dumps(index, indent=2), encoding="utf-8")
        logger.info(f"Built index with {len(skills)} skills")

        return index

    def load_index(self) -> dict | None:
        """
        Load the skill index.

        Returns:
            Index dictionary or None if not found
        """
        if not self.index_path.exists():
            return None

        try:
            return json.loads(self.index_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.error(f"Failed to load index: {e}")
            return None

    def get_skill_path(self, skill_name: str) -> Path | None:
        """
        Get the full path to a skill's SKILL.md file.

        Args:
            skill_name: Name of the skill

        Returns:
            Path to SKILL.md or None if not found
        """
        index = self.load_index()
        if not index:
            return None

        for skill in index.get("skills", []):
            if skill["name"] == skill_name:
                return self.library_dir / skill["path"]

        return None

    def list_skills(self) -> list[SkillMeta]:
        """
        List all available skills.

        Returns:
            List of SkillMeta objects
        """
        index = self.load_index()
        if not index:
            return []

        return [
            SkillMeta(
                name=s["name"],
                description=s["description"],
                source=s["source"],
                path=s["path"],
                tags=s.get("tags", []),
                tech_stack=s.get("tech_stack", []),
                category=s.get("category", ""),
            )
            for s in index.get("skills", [])
        ]

    def filter_by_tech_stack(
        self,
        tech_stack: list[str],
        max_skills: int = 15,
    ) -> list[SkillMeta]:
        """
        Filter skills by project's tech stack.

        Args:
            tech_stack: List of technologies in the project
            max_skills: Maximum number of skills to return

        Returns:
            Filtered and ranked list of skills
        """
        all_skills = self.list_skills()

        if not tech_stack:
            # Return top skills if no tech stack specified
            return all_skills[:max_skills]

        tech_stack_lower = [t.lower() for t in tech_stack]

        # Score each skill by tech stack match
        scored_skills: list[tuple[SkillMeta, int]] = []

        for skill in all_skills:
            skill_tech = [t.lower() for t in skill.tech_stack]
            skill_tags = [t.lower() for t in skill.tags]

            # Calculate match score
            score = 0
            for tech in tech_stack_lower:
                if tech in skill_tech:
                    score += 2  # Direct tech match
                elif any(tech in tag for tag in skill_tags):
                    score += 1  # Tag match

            # Also check if skill name relates to tech
            name_lower = skill.name.lower()
            for tech in tech_stack_lower:
                if tech in name_lower:
                    score += 1

            if score > 0:
                scored_skills.append((skill, score))

        # Sort by score (descending), then by name
        scored_skills.sort(key=lambda x: (-x[1], x[0].name))

        # Return top skills
        return [skill for skill, _ in scored_skills[:max_skills]]

    def get_skills_by_category(self) -> dict[str, list[SkillMeta]]:
        """
        Get all skills organized by category.

        Returns:
            Dict mapping category name to list of skills
        """
        all_skills = self.list_skills()

        categories: dict[str, list[SkillMeta]] = {}

        for skill in all_skills:
            category = skill.category or "other"
            if category not in categories:
                categories[category] = []
            categories[category].append(skill)

        # Sort skills within each category by name
        for category in categories:
            categories[category].sort(key=lambda s: s.name)

        return categories

    def get_category_counts(self) -> dict[str, int]:
        """
        Get skill counts per category.

        Returns:
            Dict mapping category name to skill count
        """
        by_category = self.get_skills_by_category()
        return {cat: len(skills) for cat, skills in by_category.items()}


def download_skills(force: bool = False) -> dict[str, int]:
    """
    Convenience function to download all skills.

    Args:
        force: If True, re-download all sources

    Returns:
        Dict mapping source name to number of skills
    """
    library = SkillLibrary()
    return library.download_all(force=force)


def get_skill_library(project_dir: Path | None = None) -> SkillLibrary:
    """
    Get a SkillLibrary instance.

    Args:
        project_dir: Project directory (or None for global library)

    Returns:
        SkillLibrary instance
    """
    return SkillLibrary(project_dir)
