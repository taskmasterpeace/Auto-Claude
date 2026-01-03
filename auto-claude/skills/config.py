"""
Skills Configuration
====================

Manages user-curated skill selection via enabled_skills.json.
Users pick which skills they want - no auto-filtering.
"""

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

CONFIG_VERSION = "1.0"
CONFIG_FILENAME = "enabled_skills.json"


@dataclass
class SkillsConfig:
    """Configuration for enabled skills."""

    version: str = CONFIG_VERSION
    enabled: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "version": self.version,
            "enabled": self.enabled,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "SkillsConfig":
        """Create from dictionary."""
        return cls(
            version=data.get("version", CONFIG_VERSION),
            enabled=data.get("enabled", []),
        )


def get_config_path(project_dir: Path) -> Path:
    """Get the path to the enabled_skills.json config file."""
    return project_dir / ".auto-claude" / CONFIG_FILENAME


def load_enabled_skills(project_dir: Path) -> list[str]:
    """
    Load the list of enabled skills for a project.

    Args:
        project_dir: Project root directory

    Returns:
        List of enabled skill identifiers (e.g., ["anthropic/pdf", "anthropic/xlsx"])
    """
    config_path = get_config_path(project_dir)

    if not config_path.exists():
        logger.debug(f"No enabled_skills.json found at {config_path}")
        return []

    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
        config = SkillsConfig.from_dict(data)
        logger.info(f"Loaded {len(config.enabled)} enabled skills from config")
        return config.enabled
    except Exception as e:
        logger.warning(f"Failed to load enabled_skills.json: {e}")
        return []


def save_enabled_skills(project_dir: Path, enabled: list[str]) -> bool:
    """
    Save the list of enabled skills for a project.

    Args:
        project_dir: Project root directory
        enabled: List of skill identifiers to enable

    Returns:
        True if saved successfully
    """
    config_path = get_config_path(project_dir)

    # Ensure directory exists
    config_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        config = SkillsConfig(enabled=enabled)
        config_path.write_text(
            json.dumps(config.to_dict(), indent=2),
            encoding="utf-8",
        )
        logger.info(f"Saved {len(enabled)} enabled skills to config")
        return True
    except Exception as e:
        logger.error(f"Failed to save enabled_skills.json: {e}")
        return False


def add_enabled_skill(project_dir: Path, skill_id: str) -> bool:
    """
    Add a skill to the enabled list.

    Args:
        project_dir: Project root directory
        skill_id: Skill identifier (e.g., "anthropic/pdf")

    Returns:
        True if added successfully
    """
    enabled = load_enabled_skills(project_dir)
    if skill_id not in enabled:
        enabled.append(skill_id)
        return save_enabled_skills(project_dir, enabled)
    return True


def remove_enabled_skill(project_dir: Path, skill_id: str) -> bool:
    """
    Remove a skill from the enabled list.

    Args:
        project_dir: Project root directory
        skill_id: Skill identifier (e.g., "anthropic/pdf")

    Returns:
        True if removed successfully
    """
    enabled = load_enabled_skills(project_dir)
    if skill_id in enabled:
        enabled.remove(skill_id)
        return save_enabled_skills(project_dir, enabled)
    return True


def is_skill_enabled(project_dir: Path, skill_id: str) -> bool:
    """
    Check if a skill is enabled.

    Args:
        project_dir: Project root directory
        skill_id: Skill identifier (e.g., "anthropic/pdf")

    Returns:
        True if skill is enabled
    """
    enabled = load_enabled_skills(project_dir)
    return skill_id in enabled
