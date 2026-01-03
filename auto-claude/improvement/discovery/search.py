"""
Discovery Search Engine for Auto Claude Self-Improvement.

Searches external sources for relevant tools, MCP servers, and packages.
"""

from pathlib import Path
from typing import Optional
from datetime import datetime
import asyncio
import aiohttp
import json
import uuid
import re

from ..models import (
    Discovery,
    ImprovementCard,
    CardType,
    CardStatus,
    ActionType,
    EffortLevel,
)
from ..store import ImprovementStore
from .sources import DiscoverySources, DiscoverySource, SourceType, ProjectContext


class DiscoveryEngine:
    """
    Engine for discovering external tools, MCP servers, and packages.

    Searches curated sources and filters results by relevance
    to the current project's tech stack.
    """

    # Cache duration in seconds (1 hour)
    CACHE_DURATION = 3600

    def __init__(self, project_dir: Path, github_token: Optional[str] = None):
        self.project_dir = Path(project_dir)
        self.store = ImprovementStore(project_dir)
        self.github_token = github_token
        self.context = ProjectContext.from_project_dir(str(project_dir))
        self._cache = {}
        self._cache_times = {}

    async def discover(
        self,
        source_types: list[SourceType] = None,
        query: str = None,
        limit: int = 20,
    ) -> list[Discovery]:
        """
        Search for relevant tools and packages.

        Args:
            source_types: Types of sources to search (default: all)
            query: Optional search query to filter results
            limit: Maximum number of results

        Returns:
            List of Discovery objects
        """
        if source_types is None:
            sources = DiscoverySources.get_relevant_sources(self.context.stack)
        else:
            sources = []
            for st in source_types:
                sources.extend(DiscoverySources.get_sources_by_type(st))

        discoveries = []

        async with aiohttp.ClientSession() as session:
            tasks = [
                self._search_source(session, source, query)
                for source in sources
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, list):
                    discoveries.extend(result)
                elif isinstance(result, Exception):
                    # Log error but continue
                    print(f"Discovery error: {result}")

        # Filter by relevance and deduplicate
        discoveries = self._filter_and_deduplicate(discoveries)

        # Sort by relevance score
        discoveries.sort(key=lambda d: d.relevance_score, reverse=True)

        return discoveries[:limit]

    async def _search_source(
        self,
        session: aiohttp.ClientSession,
        source: DiscoverySource,
        query: Optional[str] = None,
    ) -> list[Discovery]:
        """Search a single source for discoveries."""
        # Check cache
        cache_key = f"{source.name}:{query or 'default'}"
        if cache_key in self._cache:
            cache_time = self._cache_times.get(cache_key, 0)
            if (datetime.now().timestamp() - cache_time) < self.CACHE_DURATION:
                return self._cache[cache_key]

        discoveries = []

        try:
            if source.type == SourceType.MCP_SERVERS:
                discoveries = await self._search_mcp_servers(session, source, query)
            elif source.type == SourceType.GITHUB_REPOS:
                discoveries = await self._search_github(session, source, query)
            elif source.type == SourceType.NPM_PACKAGES:
                discoveries = await self._search_npm(session, source, query)
            elif source.type == SourceType.PYPI_PACKAGES:
                discoveries = await self._search_pypi(session, source, query)
            elif source.type == SourceType.AWESOME_LISTS:
                discoveries = await self._parse_awesome_list(session, source)
        except Exception as e:
            print(f"Error searching {source.name}: {e}")
            return []

        # Cache results
        self._cache[cache_key] = discoveries
        self._cache_times[cache_key] = datetime.now().timestamp()

        return discoveries

    async def _search_mcp_servers(
        self,
        session: aiohttp.ClientSession,
        source: DiscoverySource,
        query: Optional[str] = None,
    ) -> list[Discovery]:
        """Search for MCP servers on GitHub."""
        discoveries = []

        if not source.api_url:
            return discoveries

        headers = {"Accept": "application/vnd.github.v3+json"}
        if self.github_token:
            headers["Authorization"] = f"token {self.github_token}"

        # Search GitHub for MCP servers
        search_query = "mcp server" if not query else f"mcp server {query}"
        search_url = f"https://api.github.com/search/repositories?q={search_query}&sort=stars&per_page=20"

        async with session.get(search_url, headers=headers) as resp:
            if resp.status == 200:
                data = await resp.json()
                for repo in data.get("items", []):
                    discovery = Discovery(
                        id=f"mcp_{repo['id']}",
                        source=source.name,
                        type="mcp_server",
                        name=repo["name"],
                        description=repo["description"] or "No description",
                        url=repo["html_url"],
                        relevance_score=self._calculate_relevance(repo, "mcp_server"),
                        metadata={
                            "stars": repo["stargazers_count"],
                            "language": repo.get("language"),
                            "updated_at": repo["updated_at"],
                            "owner": repo["owner"]["login"],
                        },
                    )
                    discoveries.append(discovery)

        return discoveries

    async def _search_github(
        self,
        session: aiohttp.ClientSession,
        source: DiscoverySource,
        query: Optional[str] = None,
    ) -> list[Discovery]:
        """Search GitHub repositories."""
        discoveries = []

        headers = {"Accept": "application/vnd.github.v3+json"}
        if self.github_token:
            headers["Authorization"] = f"token {self.github_token}"

        # Build search query based on project stack
        stack_terms = " OR ".join(self.context.stack) if self.context.stack else ""
        search_query = query or stack_terms or "ai coding assistant"

        search_url = f"https://api.github.com/search/repositories?q={search_query}&sort=stars&per_page=20"

        try:
            async with session.get(search_url, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    for repo in data.get("items", []):
                        discovery = Discovery(
                            id=f"github_{repo['id']}",
                            source=source.name,
                            type="github_repo",
                            name=repo["name"],
                            description=repo["description"] or "No description",
                            url=repo["html_url"],
                            relevance_score=self._calculate_relevance(repo, "github"),
                            metadata={
                                "stars": repo["stargazers_count"],
                                "language": repo.get("language"),
                                "updated_at": repo["updated_at"],
                                "owner": repo["owner"]["login"],
                                "topics": repo.get("topics", []),
                            },
                        )
                        discoveries.append(discovery)
        except aiohttp.ClientError as e:
            print(f"GitHub API error: {e}")

        return discoveries

    async def _search_npm(
        self,
        session: aiohttp.ClientSession,
        source: DiscoverySource,
        query: Optional[str] = None,
    ) -> list[Discovery]:
        """Search npm packages."""
        discoveries = []

        # Build search query
        search_terms = query or " ".join(self.context.stack[:3])
        if not search_terms:
            search_terms = "react typescript"

        search_url = f"https://registry.npmjs.org/-/v1/search?text={search_terms}&size=20"

        try:
            async with session.get(search_url) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    for obj in data.get("objects", []):
                        pkg = obj["package"]
                        discovery = Discovery(
                            id=f"npm_{pkg['name']}",
                            source=source.name,
                            type="npm_package",
                            name=pkg["name"],
                            description=pkg.get("description", "No description"),
                            url=pkg.get("links", {}).get("npm", f"https://www.npmjs.com/package/{pkg['name']}"),
                            relevance_score=self._calculate_npm_relevance(obj),
                            metadata={
                                "version": pkg.get("version"),
                                "keywords": pkg.get("keywords", []),
                                "score": obj.get("score", {}),
                            },
                        )
                        discoveries.append(discovery)
        except aiohttp.ClientError as e:
            print(f"npm API error: {e}")

        return discoveries

    async def _search_pypi(
        self,
        session: aiohttp.ClientSession,
        source: DiscoverySource,
        query: Optional[str] = None,
    ) -> list[Discovery]:
        """Search PyPI packages."""
        # PyPI doesn't have a great search API, so we'll use a simple approach
        discoveries = []

        # Search for popular packages related to the query
        search_terms = query or "claude ai"

        # Use the PyPI simple API for now
        # In a real implementation, you might want to use a proper search service

        return discoveries

    async def _parse_awesome_list(
        self,
        session: aiohttp.ClientSession,
        source: DiscoverySource,
    ) -> list[Discovery]:
        """Parse an awesome list for discoveries."""
        discoveries = []

        if not source.api_url:
            return discoveries

        try:
            async with session.get(source.api_url) as resp:
                if resp.status == 200:
                    content = await resp.text()

                    # Parse markdown links
                    # Pattern: [name](url) - description
                    link_pattern = r'\[([^\]]+)\]\(([^)]+)\)(?:\s*-\s*(.+))?'
                    matches = re.findall(link_pattern, content)

                    for name, url, description in matches[:30]:  # Limit to 30
                        # Skip non-http links and anchors
                        if not url.startswith("http"):
                            continue

                        discovery = Discovery(
                            id=f"awesome_{uuid.uuid4().hex[:8]}",
                            source=source.name,
                            type="awesome_list_item",
                            name=name.strip(),
                            description=description.strip() if description else "From awesome list",
                            url=url,
                            relevance_score=self._calculate_awesome_relevance(name, description),
                            metadata={"list_source": source.url},
                        )
                        discoveries.append(discovery)
        except aiohttp.ClientError as e:
            print(f"Awesome list error: {e}")

        return discoveries

    def _calculate_relevance(self, repo: dict, source_type: str) -> float:
        """Calculate relevance score for a GitHub repo."""
        score = 0.5  # Base score

        # Boost for stars
        stars = repo.get("stargazers_count", 0)
        if stars > 1000:
            score += 0.2
        elif stars > 100:
            score += 0.1

        # Boost for matching language
        language = repo.get("language", "").lower()
        if language in [s.lower() for s in self.context.stack]:
            score += 0.15

        # Boost for recent updates
        updated = repo.get("updated_at", "")
        if updated:
            try:
                updated_date = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                days_old = (datetime.now(updated_date.tzinfo) - updated_date).days
                if days_old < 30:
                    score += 0.1
                elif days_old < 90:
                    score += 0.05
            except (ValueError, TypeError):
                pass

        # Boost for MCP servers
        if source_type == "mcp_server":
            score += 0.1

        # Boost for matching topics
        topics = repo.get("topics", [])
        matching_topics = set(t.lower() for t in topics) & set(s.lower() for s in self.context.stack)
        score += len(matching_topics) * 0.05

        return min(score, 1.0)  # Cap at 1.0

    def _calculate_npm_relevance(self, obj: dict) -> float:
        """Calculate relevance score for an npm package."""
        score = 0.5

        pkg_score = obj.get("score", {})

        # Use npm's quality and popularity scores
        quality = pkg_score.get("detail", {}).get("quality", 0)
        popularity = pkg_score.get("detail", {}).get("popularity", 0)

        score += quality * 0.2
        score += popularity * 0.2

        # Boost for matching keywords
        keywords = obj.get("package", {}).get("keywords", [])
        matching = set(k.lower() for k in keywords) & set(s.lower() for s in self.context.stack)
        score += len(matching) * 0.05

        return min(score, 1.0)

    def _calculate_awesome_relevance(self, name: str, description: str) -> float:
        """Calculate relevance score for an awesome list item."""
        score = 0.4  # Lower base score for awesome list items

        text = f"{name} {description}".lower()

        # Boost for matching stack terms
        for term in self.context.stack:
            if term.lower() in text:
                score += 0.1

        return min(score, 1.0)

    def _filter_and_deduplicate(self, discoveries: list[Discovery]) -> list[Discovery]:
        """Filter and deduplicate discoveries."""
        seen_urls = set()
        seen_names = set()
        filtered = []

        for d in discoveries:
            # Skip duplicates
            if d.url in seen_urls or d.name.lower() in seen_names:
                continue

            # Skip low relevance
            if d.relevance_score < 0.3:
                continue

            seen_urls.add(d.url)
            seen_names.add(d.name.lower())
            filtered.append(d)

        return filtered

    def create_discovery_card(self, discovery: Discovery, goal_id: Optional[str] = None) -> ImprovementCard:
        """
        Create an improvement card from a discovery.

        Args:
            discovery: The discovery to create a card from
            goal_id: Optional goal ID to associate with the card

        Returns:
            ImprovementCard ready for user review
        """
        # Determine card type and action based on discovery type
        if discovery.type == "mcp_server":
            action_type = ActionType.TOOL_INSTALL
            effort = EffortLevel.TRIVIAL
            details = f"Install MCP server: {discovery.name}"
        elif discovery.type == "npm_package":
            action_type = ActionType.TOOL_INSTALL
            effort = EffortLevel.SMALL
            details = f"npm install {discovery.name}"
        elif discovery.type == "github_repo":
            action_type = ActionType.CODE_CHANGE
            effort = EffortLevel.MEDIUM
            details = f"Review and potentially integrate: {discovery.url}"
        else:
            action_type = ActionType.CONFIG_CHANGE
            effort = EffortLevel.SMALL
            details = f"Review: {discovery.url}"

        card = ImprovementCard(
            id=f"card_{uuid.uuid4().hex[:12]}",
            type=CardType.CODE,
            title=f"Discovery: {discovery.name}",
            description=discovery.description,
            evidence={
                "source": discovery.source,
                "type": discovery.type,
                "url": discovery.url,
                "relevance_score": discovery.relevance_score,
                "metadata": discovery.metadata,
            },
            suggested_action={
                "type": action_type.value,
                "details": details,
                "effort": effort.value,
            },
            status=CardStatus.PROPOSED,
            goal_id=goal_id,
        )

        self.store.save_card(card)
        return card

    async def search_for_goal(
        self,
        goal_type: str,
        target_count: int = 5,
    ) -> list[ImprovementCard]:
        """
        Search for discoveries to fulfill a goal.

        Args:
            goal_type: Type of discovery goal (e.g., "mcp_servers", "tools")
            target_count: Number of discoveries to find

        Returns:
            List of created improvement cards
        """
        cards = []

        if goal_type == "mcp_servers":
            discoveries = await self.discover(
                source_types=[SourceType.MCP_SERVERS],
                limit=target_count * 2,  # Get extra to filter
            )
        else:
            discoveries = await self.discover(limit=target_count * 2)

        # Create cards for top discoveries
        for discovery in discoveries[:target_count]:
            card = self.create_discovery_card(discovery)
            cards.append(card)

        return cards
