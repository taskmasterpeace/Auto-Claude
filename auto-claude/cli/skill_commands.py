"""
Skill Management CLI Commands
=============================

Commands for downloading, updating, and listing skills from the skill library.
"""

import sys
from pathlib import Path

from ui import (
    Icons,
    bold,
    box,
    highlight,
    icon,
    muted,
    print_key_value,
    print_status,
)


def handle_skill_download(force: bool = False) -> None:
    """
    Download skills from all known sources.

    Args:
        force: If True, re-download even if already present
    """
    from skills import download_skills, get_skill_library

    library = get_skill_library()

    content = [
        bold(f"{icon(Icons.GEAR)} SKILL LIBRARY DOWNLOAD"),
        "",
        f"Library location: {highlight(str(library.library_dir))}",
        "",
        "Downloading skills from:",
        "  - anthropic (official skills)",
        "  - k-dense-scientific (scientific skills)",
    ]
    print(box(content, width=70, style="heavy"))
    print()

    if force:
        print_status("Force re-downloading all sources...", "info")
    else:
        print_status("Downloading new sources (use --force to re-download)...", "info")

    print()

    try:
        results = download_skills(force=force)

        total = 0
        for source, count in results.items():
            if count > 0:
                print_status(f"{source}: Downloaded {count} skills", "success")
                total += count
            else:
                print_status(f"{source}: Already up to date", "info")

        print()
        if total > 0:
            print_status(f"Total: {total} skills downloaded", "success")
        else:
            print_status("All sources already up to date", "success")

        # Show where skills are stored
        print()
        print_key_value("Skills stored at", str(library.library_dir))
        print_key_value("Index file", str(library.index_path))

    except Exception as e:
        print_status(f"Error downloading skills: {e}", "error")
        sys.exit(1)


def handle_skill_list(project_dir: Path | None = None, show_all: bool = False) -> None:
    """
    List available skills.

    Args:
        project_dir: Project directory for tech stack filtering
        show_all: If True, show all skills (not just relevant ones)
    """
    from skills import SkillIndex, get_skill_library

    library = get_skill_library()
    index = library.load_index()

    if not index:
        print_status("No skill library found. Run 'skills download' first.", "warning")
        print()
        print("Usage:")
        print("  python auto-claude/run.py --skills download")
        return

    content = [
        bold(f"{icon(Icons.GEAR)} SKILL LIBRARY"),
        "",
        f"Skills: {index['skill_count']}",
        f"Updated: {index.get('updated', 'Unknown')}",
    ]
    print(box(content, width=70, style="heavy"))
    print()

    if show_all or not project_dir:
        # Show all skills grouped by source
        skills = library.list_skills()
        sources = {}
        for skill in skills:
            if skill.source not in sources:
                sources[skill.source] = []
            sources[skill.source].append(skill)

        for source, source_skills in sorted(sources.items()):
            print(bold(f"\n{source} ({len(source_skills)} skills):"))
            for skill in sorted(source_skills, key=lambda s: s.name):
                desc = skill.description[:60]
                if len(skill.description) > 60:
                    desc = desc[:57] + "..."
                print(f"  {highlight(skill.name)}: {muted(desc)}")

    else:
        # Show filtered skills for project
        skill_index = SkillIndex(project_dir)
        tech_stack = skill_index.tech_stack

        print(bold("Detected Tech Stack:"))
        if tech_stack.languages:
            print_key_value("  Languages", ", ".join(tech_stack.languages))
        if tech_stack.frameworks:
            print_key_value("  Frameworks", ", ".join(tech_stack.frameworks))
        if tech_stack.tools:
            print_key_value("  Tools", ", ".join(tech_stack.tools))
        print()

        relevant = skill_index.get_relevant_skills(max_skills=20)
        if relevant:
            print(bold(f"Relevant Skills ({len(relevant)}):"))
            for skill in relevant:
                desc = skill.description[:50]
                if len(skill.description) > 50:
                    desc = desc[:47] + "..."
                tags = ", ".join(skill.tags[:3]) if skill.tags else ""
                print(f"  {highlight(skill.name)}: {muted(desc)}")
                if tags:
                    print(f"    {muted(f'Tags: {tags}')}")
        else:
            print_status("No skills match your tech stack", "info")
            print(muted("Run with --all to see all available skills"))


def handle_skill_update() -> None:
    """Update skill library index."""
    from skills import get_skill_library

    library = get_skill_library()

    print_status("Rebuilding skill index...", "info")

    try:
        index = library.build_index()
        print_status(f"Index updated with {index['skill_count']} skills", "success")
    except Exception as e:
        print_status(f"Error updating index: {e}", "error")
        sys.exit(1)


def handle_skill_info(skill_name: str) -> None:
    """
    Show detailed information about a specific skill.

    Args:
        skill_name: Name of the skill to show
    """
    from skills import get_skill_library

    library = get_skill_library()
    skill_path = library.get_skill_path(skill_name)

    if not skill_path or not skill_path.exists():
        print_status(f"Skill '{skill_name}' not found", "error")
        print()
        print("Use 'skills list --all' to see all available skills")
        return

    # Read and display skill content
    try:
        content = skill_path.read_text(encoding="utf-8")
        print(f"\n{bold(f'Skill: {skill_name}')}")
        print(f"{muted(f'Path: {skill_path}')}")
        print()
        print("-" * 70)
        print(content)
        print("-" * 70)
    except Exception as e:
        print_status(f"Error reading skill: {e}", "error")
