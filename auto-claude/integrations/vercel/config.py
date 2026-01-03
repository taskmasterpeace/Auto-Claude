"""
Vercel Integration Configuration
================================

Configuration dataclasses and helpers for Vercel deployment monitoring.
"""

import json
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

# Vercel deployment status constants
STATUS_QUEUED = "QUEUED"
STATUS_BUILDING = "BUILDING"
STATUS_READY = "READY"
STATUS_ERROR = "ERROR"
STATUS_CANCELED = "CANCELED"

# State file name (stored in spec directory)
VERCEL_DEPLOYMENT_STATE_FILE = ".vercel_deployment.json"

# Default configuration
DEFAULT_POLL_INTERVAL_SECONDS = 30
DEFAULT_POLL_TIMEOUT_MINUTES = 15
DEFAULT_MAX_FIX_ATTEMPTS = 5


@dataclass
class VercelConfig:
    """Configuration for Vercel integration."""

    token: str
    project_id: str
    team_id: Optional[str] = None
    auto_fix_enabled: bool = False
    poll_interval_seconds: int = DEFAULT_POLL_INTERVAL_SECONDS
    poll_timeout_minutes: int = DEFAULT_POLL_TIMEOUT_MINUTES
    max_fix_attempts: int = DEFAULT_MAX_FIX_ATTEMPTS

    @classmethod
    def from_env(cls) -> "VercelConfig":
        """Create config from environment variables."""
        return cls(
            token=os.environ.get("VERCEL_TOKEN", ""),
            project_id=os.environ.get("VERCEL_PROJECT_ID", ""),
            team_id=os.environ.get("VERCEL_TEAM_ID"),
            auto_fix_enabled=os.environ.get("VERCEL_AUTO_FIX", "").lower()
            in ("true", "1", "yes"),
        )

    def is_valid(self) -> bool:
        """Check if config has minimum required values."""
        return bool(self.token and self.project_id)


@dataclass
class VercelBuildError:
    """Structured representation of a Vercel build error."""

    error_type: str  # 'typescript', 'build', 'dependency', 'config', 'unknown'
    message: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    column: Optional[int] = None
    context: Optional[str] = None  # Surrounding log lines

    def to_dict(self) -> dict:
        return {
            "error_type": self.error_type,
            "message": self.message,
            "file_path": self.file_path,
            "line_number": self.line_number,
            "column": self.column,
            "context": self.context,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "VercelBuildError":
        return cls(
            error_type=data.get("error_type", "unknown"),
            message=data.get("message", ""),
            file_path=data.get("file_path"),
            line_number=data.get("line_number"),
            column=data.get("column"),
            context=data.get("context"),
        )


@dataclass
class VercelDeploymentState:
    """State of a Vercel deployment for tracking fix attempts."""

    deployment_id: Optional[str] = None
    commit_sha: Optional[str] = None
    status: str = STATUS_QUEUED
    url: Optional[str] = None
    error_message: Optional[str] = None
    errors: list = field(default_factory=list)  # List of VercelBuildError dicts
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    fix_attempts: int = 0
    fix_history: list = field(default_factory=list)  # History of fix attempts

    def to_dict(self) -> dict:
        return {
            "deployment_id": self.deployment_id,
            "commit_sha": self.commit_sha,
            "status": self.status,
            "url": self.url,
            "error_message": self.error_message,
            "errors": self.errors,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "fix_attempts": self.fix_attempts,
            "fix_history": self.fix_history,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "VercelDeploymentState":
        return cls(
            deployment_id=data.get("deployment_id"),
            commit_sha=data.get("commit_sha"),
            status=data.get("status", STATUS_QUEUED),
            url=data.get("url"),
            error_message=data.get("error_message"),
            errors=data.get("errors", []),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            fix_attempts=data.get("fix_attempts", 0),
            fix_history=data.get("fix_history", []),
        )

    def save(self, spec_dir: Path) -> None:
        """Save state to the spec directory."""
        state_file = spec_dir / VERCEL_DEPLOYMENT_STATE_FILE
        self.updated_at = datetime.now().isoformat()
        with open(state_file, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, spec_dir: Path) -> Optional["VercelDeploymentState"]:
        """Load state from the spec directory."""
        state_file = spec_dir / VERCEL_DEPLOYMENT_STATE_FILE
        if not state_file.exists():
            return None

        try:
            with open(state_file) as f:
                return cls.from_dict(json.load(f))
        except (OSError, json.JSONDecodeError):
            return None

    def record_fix_attempt(self, success: bool, errors_fixed: list, error: str = ""):
        """Record a fix attempt in the history."""
        self.fix_attempts += 1
        self.fix_history.append(
            {
                "attempt": self.fix_attempts,
                "timestamp": datetime.now().isoformat(),
                "success": success,
                "errors_fixed": errors_fixed,
                "error": error,
            }
        )

    def is_failed(self) -> bool:
        """Check if deployment is in a failed state."""
        return self.status == STATUS_ERROR

    def is_ready(self) -> bool:
        """Check if deployment succeeded."""
        return self.status == STATUS_READY

    def is_building(self) -> bool:
        """Check if deployment is still building."""
        return self.status in (STATUS_QUEUED, STATUS_BUILDING)

    def can_retry_fix(self, max_attempts: int = DEFAULT_MAX_FIX_ATTEMPTS) -> bool:
        """Check if we can attempt another fix."""
        return self.fix_attempts < max_attempts


def is_vercel_enabled() -> bool:
    """Check if Vercel integration is available."""
    token = os.environ.get("VERCEL_TOKEN", "")
    project_id = os.environ.get("VERCEL_PROJECT_ID", "")
    return bool(token and project_id)


def get_vercel_token() -> str:
    """Get the Vercel API token from environment."""
    return os.environ.get("VERCEL_TOKEN", "")


def get_vercel_project_id() -> str:
    """Get the Vercel project ID from environment."""
    return os.environ.get("VERCEL_PROJECT_ID", "")
