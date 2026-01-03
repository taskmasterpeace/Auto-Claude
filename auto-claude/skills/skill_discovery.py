"""
Skill Discovery Engine
======================

Analyzes projects and suggests relevant skills based on detected technologies,
frameworks, and code patterns. Checks against awesome-claude-skills and local
skills to avoid duplicate suggestions.
"""

import argparse
import asyncio
import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal

try:
    import httpx
except ImportError:
    httpx = None

from analysis.project_analyzer import ProjectAnalyzer, TechnologyStack
from skills.skill_templates import generate_skill_template

logger = logging.getLogger(__name__)


@dataclass
class SkillSuggestion:
    """A suggested skill to create."""

    name: str
    description: str
    category: Literal["framework", "testing", "deployment", "security", "patterns", "database"]
    confidence: float  # 0.0-1.0
    reasoning: str
    skill_template: str  # Generated SKILL.md content
    relevant_files: list[str]  # Files that informed the suggestion
    tech_stack: list[str]  # Technologies this skill covers

    def to_dict(self) -> dict:
        """Convert to JSON-serializable dict."""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "skill_template": self.skill_template,
            "relevant_files": self.relevant_files,
            "tech_stack": self.tech_stack,
        }


class SkillDiscoveryEngine:
    """Discover and suggest skills for a project."""

    AWESOME_SKILLS_REPO = "ComposioHQ/awesome-claude-skills"
    CACHE_TTL = timedelta(days=7)  # Refresh weekly

    def __init__(self, project_dir: Path):
        self.project_dir = Path(project_dir).resolve()
        self.cache_dir = self.project_dir / ".auto-claude"
        self.awesome_skills_cache = self.cache_dir / "awesome_skills_cache.json"
        self.dismissed_skills_file = self.cache_dir / "dismissed_skills.json"

        # Will be loaded from ProjectAnalyzer
        self.tech_stack: TechnologyStack | None = None

    async def _load_awesome_skills(self) -> set[str]:
        """Load list of skills from awesome-claude-skills repo."""
        if httpx is None:
            logger.warning("httpx not installed, cannot fetch awesome-claude-skills")
            return set()

        # Check cache
        if self.awesome_skills_cache.exists():
            try:
                cache_age = datetime.now() - datetime.fromtimestamp(
                    self.awesome_skills_cache.stat().st_mtime
                )
                if cache_age < self.CACHE_TTL:
                    with open(self.awesome_skills_cache) as f:
                        return set(json.load(f))
            except (OSError, json.JSONDecodeError):
                logger.warning("Failed to load cache, fetching fresh")

        # Fetch from GitHub
        url = f"https://api.github.com/repos/{self.AWESOME_SKILLS_REPO}/contents"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                items = response.json()
        except Exception as e:
            logger.error(f"Failed to fetch awesome-claude-skills: {e}")
            return set()

        # Extract skill names from directory names
        skill_names = {
            item["name"].lower()
            for item in items
            if isinstance(item, dict)
            and item.get("type") == "dir"
            and not item.get("name", "").startswith(".")
        }

        # Cache for future use
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        try:
            with open(self.awesome_skills_cache, "w") as f:
                json.dump(sorted(skill_names), f, indent=2)
        except OSError as e:
            logger.warning(f"Failed to cache awesome-skills: {e}")

        logger.info(f"Cached {len(skill_names)} skills from awesome-claude-skills")
        return skill_names

    def _get_local_skills(self) -> set[str]:
        """Get list of skills already created locally."""
        skills_dir = self.project_dir / ".claude" / "skills"
        if not skills_dir.exists():
            return set()

        local_skills = set()
        for skill_dir in skills_dir.iterdir():
            if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
                local_skills.add(skill_dir.name.lower())

        return local_skills

    def _get_dismissed_skills(self) -> set[str]:
        """Get list of skills that user has dismissed."""
        if not self.dismissed_skills_file.exists():
            return set()

        try:
            with open(self.dismissed_skills_file) as f:
                dismissed = json.load(f)
                return set(dismissed)
        except (OSError, json.JSONDecodeError):
            return set()

    async def _is_skill_unique(self, skill_name: str) -> bool:
        """Check if skill is unique (not in awesome-skills, local, or dismissed)."""
        awesome_skills = await self._load_awesome_skills()
        local_skills = self._get_local_skills()
        dismissed_skills = self._get_dismissed_skills()

        normalized_name = skill_name.lower().replace("_", "-")

        # Check if skill already exists
        if normalized_name in awesome_skills:
            logger.debug(f"Skipping {skill_name}: found in awesome-claude-skills")
            return False

        if normalized_name in local_skills:
            logger.debug(f"Skipping {skill_name}: already exists locally")
            return False

        if normalized_name in dismissed_skills:
            logger.debug(f"Skipping {skill_name}: previously dismissed by user")
            return False

        return True

    def _load_tech_stack(self) -> TechnologyStack:
        """Load technology stack from project analysis."""
        analyzer = ProjectAnalyzer(self.project_dir)

        # Try to load existing profile
        profile = analyzer.load_profile()

        # If no profile or needs reanalysis, analyze now
        if profile is None or analyzer.should_reanalyze(profile):
            logger.info("Analyzing project structure...")
            try:
                profile = analyzer.analyze()
            except UnicodeDecodeError as e:
                logger.warning(f"Unicode error during analysis, using partial results: {e}")
                # Return current profile even if incomplete
                if profile is not None:
                    return profile.detected_stack
                # Fallback to empty tech stack
                return TechnologyStack()
            except Exception as e:
                logger.error(f"Failed to analyze project: {e}")
                # Fallback to empty tech stack
                return TechnologyStack()

        return profile.detected_stack

    async def discover_skills(self) -> list[SkillSuggestion]:
        """Analyze project and generate skill suggestions."""
        # Load technology stack
        self.tech_stack = self._load_tech_stack()

        all_suggestions = []

        # Framework-specific skills
        all_suggestions.extend(await self._suggest_framework_skills())

        # Testing skills
        all_suggestions.extend(await self._suggest_testing_skills())

        # Deployment/DevOps skills
        all_suggestions.extend(await self._suggest_deployment_skills())

        # Database skills
        all_suggestions.extend(await self._suggest_database_skills())

        # Filter out skills that already exist
        unique_suggestions = []
        for suggestion in all_suggestions:
            if await self._is_skill_unique(suggestion.name):
                unique_suggestions.append(suggestion)

        # Sort by confidence
        return sorted(unique_suggestions, key=lambda s: s.confidence, reverse=True)

    async def _suggest_framework_skills(self) -> list[SkillSuggestion]:
        """Suggest skills based on detected frameworks."""
        suggestions = []

        if not self.tech_stack:
            return suggestions

        # React + TypeScript
        if "react" in self.tech_stack.frameworks and "typescript" in self.tech_stack.languages:
            skill_name = f"{self.project_dir.name}-react-developer"
            description = f"Develop React components following {self.project_dir.name}'s patterns and conventions"
            relevant_files = self._find_react_files()
            tech_stack_list = ["react", "typescript"]
            reasoning = "Project uses React with TypeScript. Creating project-specific component development skill."

            # Use Claude to generate contextual template
            template = generate_skill_template(
                project_dir=self.project_dir,
                skill_name=skill_name,
                skill_description=description,
                category="framework",
                tech_stack=tech_stack_list,
                relevant_files=relevant_files,
                reasoning=reasoning,
            )

            suggestions.append(
                SkillSuggestion(
                    name=skill_name,
                    description=description,
                    category="framework",
                    confidence=0.9,
                    reasoning=reasoning,
                    skill_template=template,
                    relevant_files=relevant_files,
                    tech_stack=tech_stack_list,
                )
            )

        # FastAPI / Python web frameworks
        for framework in ["fastapi", "flask", "django"]:
            if framework in self.tech_stack.frameworks:
                skill_name = f"{self.project_dir.name}-{framework}-developer"
                description = f"Create {framework.title()} endpoints following this project's API patterns"
                relevant_files = self._find_python_api_files()
                tech_stack_list = [framework, "python"]
                reasoning = f"Project uses {framework.title()}. Creating project-specific API development skill."

                # Use Claude to generate contextual template
                template = generate_skill_template(
                    project_dir=self.project_dir,
                    skill_name=skill_name,
                    skill_description=description,
                    category="framework",
                    tech_stack=tech_stack_list,
                    relevant_files=relevant_files,
                    reasoning=reasoning,
                )

                suggestions.append(
                    SkillSuggestion(
                        name=skill_name,
                        description=description,
                        category="framework",
                        confidence=0.85,
                        reasoning=reasoning,
                        skill_template=template,
                        relevant_files=relevant_files,
                        tech_stack=tech_stack_list,
                    )
                )
                break  # Only suggest one Python web framework skill

        return suggestions

    async def _suggest_testing_skills(self) -> list[SkillSuggestion]:
        """Suggest testing-related skills."""
        suggestions = []

        if not self.tech_stack:
            return suggestions

        # Jest (React/TypeScript testing)
        if "jest" in self.tech_stack.frameworks or "react" in self.tech_stack.frameworks:
            skill_name = f"{self.project_dir.name}-test-writer"
            description = "Write tests following this project's testing patterns and conventions"
            relevant_files = self._find_test_files()
            tech_stack_list = ["jest", "testing"]
            reasoning = "Project has testing framework. Creating project-specific test writing skill."

            # Use Claude to generate contextual template
            template = generate_skill_template(
                project_dir=self.project_dir,
                skill_name=skill_name,
                skill_description=description,
                category="testing",
                tech_stack=tech_stack_list,
                relevant_files=relevant_files,
                reasoning=reasoning,
            )

            suggestions.append(
                SkillSuggestion(
                    name=skill_name,
                    description=description,
                    category="testing",
                    confidence=0.8,
                    reasoning=reasoning,
                    skill_template=template,
                    relevant_files=relevant_files,
                    tech_stack=tech_stack_list,
                )
            )

        # Pytest (Python testing)
        if "pytest" in self.tech_stack.frameworks or "python" in self.tech_stack.languages:
            suggestions.append(
                SkillSuggestion(
                    name=f"{self.project_dir.name}-pytest-writer",
                    description="Write pytest tests following this project's testing conventions",
                    category="testing",
                    confidence=0.8,
                    reasoning="Project uses Python. Creating project-specific pytest writing skill.",
                    skill_template=self._generate_pytest_skill_template(),
                    relevant_files=self._find_pytest_files(),
                    tech_stack=["pytest", "python"],
                )
            )

        return suggestions

    async def _suggest_deployment_skills(self) -> list[SkillSuggestion]:
        """Suggest deployment/DevOps skills."""
        suggestions = []

        if not self.tech_stack:
            return suggestions

        # Docker
        if "docker" in self.tech_stack.infrastructure:
            suggestions.append(
                SkillSuggestion(
                    name=f"{self.project_dir.name}-docker-specialist",
                    description="Manage Docker containers and compose files for this project",
                    category="deployment",
                    confidence=0.75,
                    reasoning="Project uses Docker. Creating project-specific Docker management skill.",
                    skill_template=self._generate_docker_skill_template(),
                    relevant_files=self._find_docker_files(),
                    tech_stack=["docker"],
                )
            )

        return suggestions

    async def _suggest_database_skills(self) -> list[SkillSuggestion]:
        """Suggest database-related skills."""
        suggestions = []

        if not self.tech_stack or not self.tech_stack.databases:
            return suggestions

        # Only suggest if multiple databases or specific patterns detected
        db_list = ", ".join(self.tech_stack.databases[:3])
        if len(self.tech_stack.databases) >= 2:
            suggestions.append(
                SkillSuggestion(
                    name=f"{self.project_dir.name}-database-specialist",
                    description=f"Manage database operations with {db_list}",
                    category="patterns",
                    confidence=0.7,
                    reasoning=f"Project uses multiple databases: {db_list}. Creating database management skill.",
                    skill_template=self._generate_database_skill_template(),
                    relevant_files=self._find_database_files(),
                    tech_stack=self.tech_stack.databases[:3],
                )
            )

        return suggestions

    # -------------------------------------------------------------------------
    # Template generators
    # -------------------------------------------------------------------------

    def _generate_react_skill_template(self) -> str:
        """Generate SKILL.md template for React development."""
        return f"""---
name: {self.project_dir.name}-react-developer
description: Develop React components following {self.project_dir.name}'s patterns and conventions. Use when creating new components, updating UI, or implementing features in the React frontend.
allowed-tools: Read, Write, Edit, Bash(npm|pnpm|yarn), Grep, Glob
---

# {self.project_dir.name.replace('-', ' ').title()} React Developer

Expert at creating React components that follow this project's patterns.

## Project Conventions

Based on analysis of {self.project_dir.name}:
- TypeScript for type safety
- Functional components with hooks
- Follow existing component structure and naming
- Use project's state management patterns
- Follow project's styling approach

## Responsibilities

1. Create components following existing patterns
2. Ensure TypeScript types are correct
3. Follow component file structure conventions
4. Use appropriate hooks (useState, useEffect, custom hooks)
5. Implement proper error handling
6. Add appropriate tests

## Quality Checks

- Component is properly typed
- No prop drilling (use context if needed)
- Memoization used appropriately
- Accessible UI (ARIA labels, keyboard nav)
- Follows project's naming conventions
"""

    def _generate_python_api_skill_template(self, framework: str) -> str:
        """Generate SKILL.md template for Python API development."""
        return f"""---
name: {self.project_dir.name}-{framework}-developer
description: Create {framework.title()} endpoints following {self.project_dir.name}'s API patterns. Use when adding new endpoints, modifying existing APIs, or implementing backend features.
allowed-tools: Read, Write, Edit, Bash(python|pip|poetry|uv), Grep, Glob
---

# {self.project_dir.name.replace('-', ' ').title()} {framework.title()} Developer

Expert at building API endpoints that follow this project's conventions.

## Project Conventions

Based on analysis of {self.project_dir.name}:
- Python {framework.title()} for API development
- Follow existing routing patterns
- Use project's authentication/authorization patterns
- Follow project's error handling conventions
- Use project's database patterns

## Responsibilities

1. Create endpoints following RESTful principles
2. Implement proper request/response validation
3. Add comprehensive error handling
4. Follow project's database patterns
5. Add appropriate tests
6. Update API documentation

## Quality Checks

- Endpoints are properly typed (Pydantic models)
- Input validation at boundaries
- Proper HTTP status codes
- No hardcoded secrets
- Database queries are optimized
- Tests cover happy path and error cases
"""

    def _generate_testing_skill_template(self) -> str:
        """Generate SKILL.md template for testing."""
        return f"""---
name: {self.project_dir.name}-test-writer
description: Write tests following {self.project_dir.name}'s testing patterns and conventions. Use when adding tests for new features or improving test coverage.
allowed-tools: Read, Write, Edit, Bash(npm test|yarn test|pnpm test), Grep, Glob
---

# {self.project_dir.name.replace('-', ' ').title()} Test Writer

Expert at writing tests that follow this project's testing patterns.

## Project Conventions

Based on analysis of {self.project_dir.name}:
- Follow existing test file structure
- Use project's testing utilities and helpers
- Match existing test patterns and assertions
- Follow project's mocking conventions

## Responsibilities

1. Write tests for new features
2. Follow project's test organization
3. Use appropriate test utilities
4. Cover happy path and edge cases
5. Keep tests maintainable and readable
6. Update tests when code changes

## Quality Checks

- Tests are isolated and don't depend on each other
- Proper setup and teardown
- Clear test descriptions
- Tests cover edge cases
- No flaky tests
- Tests run quickly
"""

    def _generate_pytest_skill_template(self) -> str:
        """Generate SKILL.md template for pytest."""
        return f"""---
name: {self.project_dir.name}-pytest-writer
description: Write pytest tests following {self.project_dir.name}'s conventions. Use when adding Python tests or improving test coverage.
allowed-tools: Read, Write, Edit, Bash(pytest|python -m pytest), Grep, Glob
---

# {self.project_dir.name.replace('-', ' ').title()} Pytest Writer

Expert at writing pytest tests that follow this project's patterns.

## Project Conventions

Based on analysis of {self.project_dir.name}:
- Use pytest framework
- Follow existing fixture patterns
- Use project's test utilities
- Follow project's directory structure

## Responsibilities

1. Write unit tests for new code
2. Use appropriate pytest fixtures
3. Follow project's test organization
4. Use parametrize for multiple test cases
5. Add integration tests where appropriate
6. Keep tests maintainable

## Quality Checks

- Tests use appropriate fixtures
- Tests are isolated
- Clear test names following project convention
- Good coverage of edge cases
- No shared state between tests
- Tests are fast and focused
"""

    def _generate_docker_skill_template(self) -> str:
        """Generate SKILL.md template for Docker."""
        return f"""---
name: {self.project_dir.name}-docker-specialist
description: Manage Docker containers and compose files for {self.project_dir.name}. Use when working with containerization or deployment.
allowed-tools: Read, Write, Edit, Bash(docker|docker-compose), Grep, Glob
---

# {self.project_dir.name.replace('-', ' ').title()} Docker Specialist

Expert at managing Docker containers for this project.

## Project Conventions

Based on analysis of {self.project_dir.name}:
- Follow existing Dockerfile patterns
- Use multi-stage builds if applicable
- Follow docker-compose conventions
- Use project's environment variable patterns

## Responsibilities

1. Maintain Dockerfiles
2. Manage docker-compose configurations
3. Optimize container builds
4. Handle multi-container setups
5. Manage volumes and networks
6. Follow best practices for security

## Quality Checks

- Images are small and efficient
- Multi-stage builds used appropriately
- No secrets in images
- Proper health checks
- Volume mounts are correct
- Environment variables properly configured
"""

    def _generate_database_skill_template(self) -> str:
        """Generate SKILL.md template for database operations."""
        db_list = ", ".join(self.tech_stack.databases[:3]) if self.tech_stack else "databases"
        return f"""---
name: {self.project_dir.name}-database-specialist
description: Manage database operations with {db_list} for {self.project_dir.name}. Use when working with data models, migrations, or queries.
allowed-tools: Read, Write, Edit, Bash(python|psql|mysql|mongodb), Grep, Glob
---

# {self.project_dir.name.replace('-', ' ').title()} Database Specialist

Expert at database operations for this project.

## Project Conventions

Based on analysis of {self.project_dir.name}:
- Uses {db_list}
- Follow existing schema patterns
- Use project's migration tools
- Follow query optimization patterns

## Responsibilities

1. Create and modify database schemas
2. Write efficient queries
3. Create and manage migrations
4. Optimize database performance
5. Ensure data integrity
6. Add proper indexes

## Quality Checks

- Migrations are reversible
- Queries are optimized
- Proper indexes exist
- Foreign keys are correct
- No N+1 query problems
- Transactions used appropriately
"""

    # -------------------------------------------------------------------------
    # File finders
    # -------------------------------------------------------------------------

    def _find_react_files(self) -> list[str]:
        """Find React component files."""
        files = []
        for ext in ["tsx", "jsx"]:
            files.extend(str(p.relative_to(self.project_dir)) for p in self.project_dir.rglob(f"*.{ext}"))
        return sorted(files[:10])  # Limit to first 10

    def _find_python_api_files(self) -> list[str]:
        """Find Python API files."""
        files = []
        for pattern in ["**/routes/*.py", "**/api/*.py", "**/views/*.py", "**/endpoints/*.py"]:
            files.extend(str(p.relative_to(self.project_dir)) for p in self.project_dir.glob(pattern))
        return sorted(files[:10])

    def _find_test_files(self) -> list[str]:
        """Find test files."""
        files = []
        for pattern in ["**/*.test.ts", "**/*.test.tsx", "**/*.test.js", "**/*.spec.ts"]:
            files.extend(str(p.relative_to(self.project_dir)) for p in self.project_dir.glob(pattern))
        return sorted(files[:10])

    def _find_pytest_files(self) -> list[str]:
        """Find pytest files."""
        files = []
        for pattern in ["**/test_*.py", "**/*_test.py"]:
            files.extend(str(p.relative_to(self.project_dir)) for p in self.project_dir.glob(pattern))
        return sorted(files[:10])

    def _find_docker_files(self) -> list[str]:
        """Find Docker-related files."""
        files = []
        for pattern in ["Dockerfile*", "docker-compose*.yml", "docker-compose*.yaml", ".dockerignore"]:
            files.extend(str(p.relative_to(self.project_dir)) for p in self.project_dir.glob(pattern))
        return sorted(files)

    def _find_database_files(self) -> list[str]:
        """Find database-related files."""
        files = []
        for pattern in ["**/models/*.py", "**/migrations/*.py", "**/schema/*.py", "**/*.sql"]:
            files.extend(str(p.relative_to(self.project_dir)) for p in self.project_dir.glob(pattern))
        return sorted(files[:10])


# =============================================================================
# CLI for testing
# =============================================================================


async def main():
    """CLI entry point for testing."""
    parser = argparse.ArgumentParser(description="Discover skills for a project")
    parser.add_argument("--project-dir", type=Path, required=True, help="Project directory to analyze")
    parser.add_argument("--output-json", action="store_true", help="Output JSON instead of human-readable")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    # Setup logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=log_level, format="%(levelname)s: %(message)s")

    if not args.project_dir.exists():
        logger.error(f"Project directory does not exist: {args.project_dir}")
        return 1

    # Discover skills
    engine = SkillDiscoveryEngine(args.project_dir)
    suggestions = await engine.discover_skills()

    if args.output_json:
        # JSON output for IPC integration
        print(json.dumps([s.to_dict() for s in suggestions], indent=2))
    else:
        # Human-readable output
        print(f"\n🔍 Found {len(suggestions)} skill suggestions for {args.project_dir.name}:\n")
        for i, suggestion in enumerate(suggestions, 1):
            print(f"{i}. {suggestion.name}")
            print(f"   Category: {suggestion.category}")
            print(f"   Confidence: {suggestion.confidence:.0%}")
            print(f"   Description: {suggestion.description}")
            print(f"   Tech Stack: {', '.join(suggestion.tech_stack)}")
            print(f"   Reasoning: {suggestion.reasoning}")
            print()

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
