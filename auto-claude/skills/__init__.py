"""
Skill Discovery & Management
=============================

User-curated skill selection system:
- Project skills (.claude/skills/) - Full content, always included
- Library skills - User picks which ones to enable via UI
- enabled_skills.json - Per-project configuration
"""

from .config import (
    SkillsConfig,
    add_enabled_skill,
    is_skill_enabled,
    load_enabled_skills,
    remove_enabled_skill,
    save_enabled_skills,
)
from .index import ProjectTechStack, SkillIndex, detect_project_tech_stack, get_skill_index
from .injector import Skill, SkillInjector, get_skill_context
from .library import SkillLibrary, SkillMeta, download_skills, get_skill_library
from .skill_discovery import SkillDiscoveryEngine, SkillSuggestion

__all__ = [
    # Discovery
    "SkillDiscoveryEngine",
    "SkillSuggestion",
    # Injection
    "SkillInjector",
    "Skill",
    "get_skill_context",
    # Library
    "SkillLibrary",
    "SkillMeta",
    "download_skills",
    "get_skill_library",
    # Index
    "SkillIndex",
    "ProjectTechStack",
    "detect_project_tech_stack",
    "get_skill_index",
    # Config
    "SkillsConfig",
    "load_enabled_skills",
    "save_enabled_skills",
    "add_enabled_skill",
    "remove_enabled_skill",
    "is_skill_enabled",
]
