"""
Skill Management for Agent System
==================================

Handles skill injection into agent prompts to "nudge" agents with
project-specific knowledge and conventions.

Skills are loaded from .claude/skills/ and matched to agent types.
"""

import logging
from pathlib import Path
from typing import Literal

from ui import print_status

logger = logging.getLogger(__name__)


def get_skill_context_for_agent(
    project_dir: Path,
    agent_type: Literal["planner", "coder", "qa_reviewer", "qa_fixer"],
) -> str:
    """
    Get skill context for an agent.

    This function loads relevant skills from .claude/skills/ and formats
    them for injection into the agent's prompt.

    Args:
        project_dir: Root project directory
        agent_type: Type of agent requesting context

    Returns:
        Formatted skill context string (empty if no relevant skills)
    """
    try:
        from skills import get_skill_context

        context = get_skill_context(project_dir, agent_type)
        if context:
            logger.info(f"Loaded skill context for {agent_type} agent")
        return context
    except ImportError:
        logger.debug("Skills module not available")
        return ""
    except Exception as e:
        logger.warning(f"Failed to load skill context: {e}")
        return ""


def debug_skills_status(project_dir: Path) -> None:
    """
    Print skill system status for debugging.

    Args:
        project_dir: Root project directory
    """
    from debug import debug, debug_section, is_debug_enabled

    if not is_debug_enabled():
        return

    try:
        from skills import SkillInjector

        injector = SkillInjector(project_dir)
        all_skills = injector.load_all_skills()

        debug_section("skills", "Skill System Status")

        if all_skills:
            skill_names = [s.name for s in all_skills]
            debug(
                "skills",
                f"Found {len(all_skills)} skills in .claude/skills/",
                skills=skill_names,
            )
        else:
            debug("skills", "No skills found in .claude/skills/")

    except ImportError:
        debug("skills", "Skills module not available")
    except Exception as e:
        debug("skills", f"Failed to check skills: {e}")
