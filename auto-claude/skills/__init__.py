"""
Skill Discovery & Management
=============================

Automatically discovers and suggests project-specific skills based on
detected technologies, frameworks, and patterns in the codebase.
"""

from .skill_discovery import SkillDiscoveryEngine, SkillSuggestion

__all__ = ["SkillDiscoveryEngine", "SkillSuggestion"]
