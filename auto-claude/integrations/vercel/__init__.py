"""
Vercel Integration
==================

Provides build error detection and auto-fix capabilities for Vercel deployments.
Polls Vercel API after merges to detect failed builds and coordinates fixes.

Usage:
    # Check if Vercel is enabled
    if is_vercel_enabled():
        config = VercelConfig.from_env()
        ...

Environment Variables:
    VERCEL_TOKEN: Vercel API token (required)
    VERCEL_PROJECT_ID: Vercel project ID (required)
    VERCEL_TEAM_ID: Vercel team ID (optional, for team accounts)
    VERCEL_AUTO_FIX: Enable auto-fix mode (optional, default: false)
"""

from .config import (
    VERCEL_DEPLOYMENT_STATE_FILE,
    VercelConfig,
    VercelDeploymentState,
    is_vercel_enabled,
)

__all__ = [
    "VercelConfig",
    "VercelDeploymentState",
    "is_vercel_enabled",
    "VERCEL_DEPLOYMENT_STATE_FILE",
]
