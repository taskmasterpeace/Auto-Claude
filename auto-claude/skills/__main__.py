"""
Entry point for running skills.skill_discovery as a module.
Enables: python -m skills.skill_discovery
"""

from skills.skill_discovery import main
import asyncio
import sys

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
