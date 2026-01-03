"""
Discovery Engine for Auto Claude Self-Improvement

Searches external sources for relevant tools, MCP servers, and packages
that could benefit the current project.
"""

from .sources import DiscoverySources
from .search import DiscoveryEngine

__all__ = ["DiscoverySources", "DiscoveryEngine"]
