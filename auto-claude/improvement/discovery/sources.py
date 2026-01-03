"""
Discovery Sources for Auto Claude Self-Improvement.

Curated sources for tool, MCP server, and package discovery.
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class SourceType(str, Enum):
    """Type of discovery source."""
    MCP_SERVERS = "mcp_servers"
    GITHUB_REPOS = "github_repos"
    NPM_PACKAGES = "npm_packages"
    PYPI_PACKAGES = "pypi_packages"
    AWESOME_LISTS = "awesome_lists"


@dataclass
class DiscoverySource:
    """A source for discovering tools and packages."""
    name: str
    type: SourceType
    url: str
    description: str
    api_url: Optional[str] = None
    search_enabled: bool = True
    requires_auth: bool = False


class DiscoverySources:
    """
    Registry of curated sources for tool/package discovery.

    Provides access to:
    - MCP server registries
    - GitHub trending repos
    - npm/PyPI package search
    - Awesome lists and curated resources
    """

    # MCP Server sources
    MCP_SOURCES = [
        DiscoverySource(
            name="Official MCP Servers",
            type=SourceType.MCP_SERVERS,
            url="https://github.com/modelcontextprotocol/servers",
            description="Official Model Context Protocol server implementations",
            api_url="https://api.github.com/repos/modelcontextprotocol/servers/contents",
        ),
        DiscoverySource(
            name="MCP Server Topic",
            type=SourceType.MCP_SERVERS,
            url="https://github.com/topics/mcp-server",
            description="GitHub repos tagged with mcp-server topic",
            api_url="https://api.github.com/search/repositories?q=topic:mcp-server",
        ),
        DiscoverySource(
            name="Awesome MCP Servers",
            type=SourceType.AWESOME_LISTS,
            url="https://github.com/punkpeye/awesome-mcp-servers",
            description="Curated list of MCP servers",
            api_url="https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md",
        ),
    ]

    # GitHub repository sources
    GITHUB_SOURCES = [
        DiscoverySource(
            name="GitHub Trending",
            type=SourceType.GITHUB_REPOS,
            url="https://github.com/trending",
            description="Trending GitHub repositories",
            api_url="https://api.github.com/search/repositories?q=stars:>100&sort=stars",
        ),
        DiscoverySource(
            name="Claude Code Topic",
            type=SourceType.GITHUB_REPOS,
            url="https://github.com/topics/claude-code",
            description="GitHub repos tagged with claude-code topic",
            api_url="https://api.github.com/search/repositories?q=topic:claude-code",
        ),
        DiscoverySource(
            name="AI Coding Assistants",
            type=SourceType.GITHUB_REPOS,
            url="https://github.com/topics/ai-coding-assistant",
            description="AI coding assistant tools and plugins",
            api_url="https://api.github.com/search/repositories?q=topic:ai-coding-assistant",
        ),
    ]

    # npm package sources
    NPM_SOURCES = [
        DiscoverySource(
            name="npm Search",
            type=SourceType.NPM_PACKAGES,
            url="https://www.npmjs.com/search",
            description="Search npm packages",
            api_url="https://registry.npmjs.org/-/v1/search",
        ),
    ]

    # PyPI package sources
    PYPI_SOURCES = [
        DiscoverySource(
            name="PyPI Search",
            type=SourceType.PYPI_PACKAGES,
            url="https://pypi.org/search",
            description="Search PyPI packages",
            api_url="https://pypi.org/pypi",
        ),
    ]

    # Awesome lists for various stacks
    AWESOME_LISTS = [
        DiscoverySource(
            name="Awesome Claude",
            type=SourceType.AWESOME_LISTS,
            url="https://github.com/anthropics/anthropic-cookbook",
            description="Anthropic's cookbook with Claude examples",
            api_url="https://api.github.com/repos/anthropics/anthropic-cookbook/contents",
        ),
        DiscoverySource(
            name="Awesome React",
            type=SourceType.AWESOME_LISTS,
            url="https://github.com/enaqx/awesome-react",
            description="Curated list of React resources",
            api_url="https://raw.githubusercontent.com/enaqx/awesome-react/master/README.md",
        ),
        DiscoverySource(
            name="Awesome Python",
            type=SourceType.AWESOME_LISTS,
            url="https://github.com/vinta/awesome-python",
            description="Curated list of Python resources",
            api_url="https://raw.githubusercontent.com/vinta/awesome-python/master/README.md",
        ),
        DiscoverySource(
            name="Awesome TypeScript",
            type=SourceType.AWESOME_LISTS,
            url="https://github.com/dzharii/awesome-typescript",
            description="Curated list of TypeScript resources",
            api_url="https://raw.githubusercontent.com/dzharii/awesome-typescript/master/README.md",
        ),
    ]

    @classmethod
    def get_all_sources(cls) -> list[DiscoverySource]:
        """Get all discovery sources."""
        return (
            cls.MCP_SOURCES +
            cls.GITHUB_SOURCES +
            cls.NPM_SOURCES +
            cls.PYPI_SOURCES +
            cls.AWESOME_LISTS
        )

    @classmethod
    def get_sources_by_type(cls, source_type: SourceType) -> list[DiscoverySource]:
        """Get sources filtered by type."""
        return [s for s in cls.get_all_sources() if s.type == source_type]

    @classmethod
    def get_mcp_sources(cls) -> list[DiscoverySource]:
        """Get all MCP server sources."""
        return cls.MCP_SOURCES

    @classmethod
    def get_relevant_sources(cls, stack: list[str]) -> list[DiscoverySource]:
        """
        Get sources relevant to a project's tech stack.

        Args:
            stack: List of technologies (e.g., ['react', 'typescript', 'python'])

        Returns:
            List of relevant discovery sources
        """
        sources = []

        # Always include MCP sources
        sources.extend(cls.MCP_SOURCES)

        # Add package sources based on stack
        if any(t in stack for t in ["node", "npm", "react", "typescript", "javascript"]):
            sources.extend(cls.NPM_SOURCES)

        if any(t in stack for t in ["python", "pip", "django", "flask", "fastapi"]):
            sources.extend(cls.PYPI_SOURCES)

        # Add relevant awesome lists
        stack_lower = [s.lower() for s in stack]
        for source in cls.AWESOME_LISTS:
            source_name_lower = source.name.lower()
            if any(t in source_name_lower for t in stack_lower):
                sources.append(source)

        # Always include general GitHub sources
        sources.extend(cls.GITHUB_SOURCES)

        return sources


@dataclass
class ProjectContext:
    """Context about a project for relevance filtering."""
    path: str
    name: str
    stack: list[str] = field(default_factory=list)
    dependencies: dict = field(default_factory=dict)
    has_package_json: bool = False
    has_requirements_txt: bool = False
    has_pyproject_toml: bool = False
    has_github: bool = False
    frameworks: list[str] = field(default_factory=list)

    @classmethod
    def from_project_dir(cls, project_dir: str) -> "ProjectContext":
        """
        Create ProjectContext by analyzing a project directory.

        Args:
            project_dir: Path to the project directory

        Returns:
            ProjectContext with detected stack information
        """
        from pathlib import Path
        import json

        project_path = Path(project_dir)
        context = cls(
            path=str(project_path),
            name=project_path.name,
        )

        # Check for package.json (Node.js/npm)
        package_json = project_path / "package.json"
        if package_json.exists():
            context.has_package_json = True
            context.stack.append("node")
            try:
                with open(package_json) as f:
                    pkg = json.load(f)
                    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                    context.dependencies["npm"] = deps

                    # Detect frameworks
                    if "react" in deps:
                        context.stack.append("react")
                        context.frameworks.append("react")
                    if "vue" in deps:
                        context.stack.append("vue")
                        context.frameworks.append("vue")
                    if "next" in deps:
                        context.stack.append("nextjs")
                        context.frameworks.append("nextjs")
                    if "typescript" in deps:
                        context.stack.append("typescript")
                    if "electron" in deps:
                        context.stack.append("electron")
                        context.frameworks.append("electron")
            except (json.JSONDecodeError, IOError):
                pass

        # Check for requirements.txt (Python)
        requirements_txt = project_path / "requirements.txt"
        if requirements_txt.exists():
            context.has_requirements_txt = True
            context.stack.append("python")
            try:
                with open(requirements_txt) as f:
                    deps = {}
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            # Parse package name (before ==, >=, etc.)
                            pkg_name = line.split("==")[0].split(">=")[0].split("<=")[0].strip()
                            deps[pkg_name] = line
                    context.dependencies["pip"] = deps

                    # Detect frameworks
                    if "django" in deps:
                        context.frameworks.append("django")
                    if "flask" in deps:
                        context.frameworks.append("flask")
                    if "fastapi" in deps:
                        context.frameworks.append("fastapi")
            except IOError:
                pass

        # Check for pyproject.toml
        pyproject = project_path / "pyproject.toml"
        if pyproject.exists():
            context.has_pyproject_toml = True
            if "python" not in context.stack:
                context.stack.append("python")

        # Check for .github directory
        if (project_path / ".github").exists():
            context.has_github = True

        return context
