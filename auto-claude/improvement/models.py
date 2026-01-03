"""
Data models for the Self-Improvement System

These models define the core data structures used throughout the improvement
system: cards, goals, reflections, patterns, and discoveries.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from pathlib import Path
import json
import uuid


class CardType(str, Enum):
    """Type of improvement card."""
    REFLECTION = "reflection"      # From analyzing past task outcomes
    DISCOVERY = "discovery"        # From external tool/package search
    OPTIMIZATION = "optimization"  # From performance/quality analysis


class CardStatus(str, Enum):
    """Status of an improvement card."""
    PROPOSED = "proposed"    # Generated, awaiting user review
    APPROVED = "approved"    # User approved, ready to apply
    APPLIED = "applied"      # Successfully applied
    DISMISSED = "dismissed"  # User dismissed


class ActionType(str, Enum):
    """Type of action suggested by a card."""
    PROMPT_UPDATE = "prompt_update"    # Modify agent prompts
    TOOL_INSTALL = "tool_install"      # Install MCP server/plugin
    CONFIG_CHANGE = "config_change"    # Update configuration
    CODE_CHANGE = "code_change"        # Modify codebase


class EffortLevel(str, Enum):
    """Estimated effort to implement a card's suggestion."""
    TRIVIAL = "trivial"    # < 5 minutes, one-liner
    SMALL = "small"        # < 30 minutes
    MEDIUM = "medium"      # < 2 hours
    LARGE = "large"        # > 2 hours


class GoalType(str, Enum):
    """Type of improvement goal."""
    METRIC = "metric"           # Improve a measurable metric
    DISCOVERY = "discovery"     # Discover N relevant tools
    PATTERN_FIX = "pattern_fix" # Fix recurring patterns


class GoalStatus(str, Enum):
    """Status of an improvement goal."""
    ACTIVE = "active"       # Currently being worked on
    ACHIEVED = "achieved"   # Goal met
    ABANDONED = "abandoned" # User abandoned


@dataclass
class SuggestedAction:
    """Action suggested by an improvement card."""
    type: ActionType
    details: str
    effort: EffortLevel
    command: Optional[str] = None  # CLI command to execute if applicable


@dataclass
class CardEvidence:
    """Evidence supporting an improvement card."""
    occurrences: int = 0
    examples: list[str] = field(default_factory=list)
    metrics: dict[str, float] = field(default_factory=dict)
    relevance_score: Optional[float] = None  # 0-1 for discovery cards


@dataclass
class ImprovementCard:
    """
    A card representing a proposed improvement.

    Cards are generated automatically by the reflection and discovery engines,
    and require user approval before any action is taken.
    """
    id: str
    type: CardType
    title: str
    description: str
    evidence: CardEvidence
    suggested_action: SuggestedAction
    status: CardStatus = CardStatus.PROPOSED
    goal_id: Optional[str] = None  # Links to parent goal if any
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    applied_at: Optional[datetime] = None

    @classmethod
    def create(
        cls,
        type: CardType,
        title: str,
        description: str,
        evidence: CardEvidence,
        suggested_action: SuggestedAction,
        goal_id: Optional[str] = None,
    ) -> "ImprovementCard":
        """Factory method to create a new card with generated ID."""
        return cls(
            id=f"card-{uuid.uuid4().hex[:8]}",
            type=type,
            title=title,
            description=description,
            evidence=evidence,
            suggested_action=suggested_action,
            goal_id=goal_id,
        )

    def approve(self) -> None:
        """Mark card as approved."""
        self.status = CardStatus.APPROVED
        self.updated_at = datetime.now()

    def dismiss(self) -> None:
        """Mark card as dismissed."""
        self.status = CardStatus.DISMISSED
        self.updated_at = datetime.now()

    def apply(self) -> None:
        """Mark card as applied."""
        self.status = CardStatus.APPLIED
        self.updated_at = datetime.now()
        self.applied_at = datetime.now()

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "type": self.type.value,
            "title": self.title,
            "description": self.description,
            "evidence": {
                "occurrences": self.evidence.occurrences,
                "examples": self.evidence.examples,
                "metrics": self.evidence.metrics,
                "relevance_score": self.evidence.relevance_score,
            },
            "suggested_action": {
                "type": self.suggested_action.type.value,
                "details": self.suggested_action.details,
                "effort": self.suggested_action.effort.value,
                "command": self.suggested_action.command,
            },
            "status": self.status.value,
            "goal_id": self.goal_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ImprovementCard":
        """Create from dictionary."""
        return cls(
            id=data["id"],
            type=CardType(data["type"]),
            title=data["title"],
            description=data["description"],
            evidence=CardEvidence(
                occurrences=data["evidence"].get("occurrences", 0),
                examples=data["evidence"].get("examples", []),
                metrics=data["evidence"].get("metrics", {}),
                relevance_score=data["evidence"].get("relevance_score"),
            ),
            suggested_action=SuggestedAction(
                type=ActionType(data["suggested_action"]["type"]),
                details=data["suggested_action"]["details"],
                effort=EffortLevel(data["suggested_action"]["effort"]),
                command=data["suggested_action"].get("command"),
            ),
            status=CardStatus(data.get("status", "proposed")),
            goal_id=data.get("goal_id"),
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            applied_at=datetime.fromisoformat(data["applied_at"]) if data.get("applied_at") else None,
        )


@dataclass
class GoalMetric:
    """Metric being tracked by a goal."""
    name: str
    current: float
    target: float
    unit: str

    @property
    def progress(self) -> float:
        """Calculate progress toward target (0-100)."""
        if self.target == self.current:
            return 100.0

        # Handle both improvement (decrease) and increase goals
        if self.target < self.current:
            # Goal is to decrease (e.g., QA iterations: 3.2 -> 2.0)
            initial_gap = self.current  # Assume started from current
            remaining_gap = self.current - self.target
            if remaining_gap <= 0:
                return 100.0
            # This is a simplification - in real impl we'd track initial value
            return min(100.0, max(0.0, ((self.current - self.target) / self.current) * 100))
        else:
            # Goal is to increase (e.g., success rate: 78% -> 95%)
            if self.target == 0:
                return 100.0
            return min(100.0, max(0.0, (self.current / self.target) * 100))


@dataclass
class ImprovementGoal:
    """
    An improvement goal that drives the improvement loop.

    Goals define what we're trying to achieve. The loop iterates,
    generating cards and checking progress until the goal is met.
    """
    id: str
    type: GoalType
    target: str  # Human-readable target description
    description: str
    status: GoalStatus = GoalStatus.ACTIVE
    metric: Optional[GoalMetric] = None  # For metric-type goals
    discovery_count: int = 0  # For discovery-type goals: how many to find
    discovered_so_far: int = 0
    card_ids: list[str] = field(default_factory=list)  # Cards addressing this goal
    created_at: datetime = field(default_factory=datetime.now)
    achieved_at: Optional[datetime] = None

    @property
    def progress(self) -> float:
        """Calculate progress toward goal (0-100)."""
        if self.status == GoalStatus.ACHIEVED:
            return 100.0

        if self.type == GoalType.METRIC and self.metric:
            return self.metric.progress
        elif self.type == GoalType.DISCOVERY and self.discovery_count > 0:
            return min(100.0, (self.discovered_so_far / self.discovery_count) * 100)
        elif self.type == GoalType.PATTERN_FIX:
            # Track by approved/applied cards
            if not self.card_ids:
                return 0.0
            # Would need card store to check status - simplified for now
            return min(100.0, len(self.card_ids) * 33.3)  # Assume 3 patterns

        return 0.0

    @classmethod
    def create_metric_goal(
        cls,
        target: str,
        metric_name: str,
        current_value: float,
        target_value: float,
        unit: str,
        description: str = "",
    ) -> "ImprovementGoal":
        """Create a metric-based goal."""
        return cls(
            id=f"goal-{uuid.uuid4().hex[:8]}",
            type=GoalType.METRIC,
            target=target,
            description=description or f"Improve {metric_name} from {current_value} to {target_value} {unit}",
            metric=GoalMetric(
                name=metric_name,
                current=current_value,
                target=target_value,
                unit=unit,
            ),
        )

    @classmethod
    def create_discovery_goal(
        cls,
        target: str,
        count: int,
        description: str = "",
    ) -> "ImprovementGoal":
        """Create a discovery-based goal."""
        return cls(
            id=f"goal-{uuid.uuid4().hex[:8]}",
            type=GoalType.DISCOVERY,
            target=target,
            description=description or f"Discover {count} relevant tools/servers",
            discovery_count=count,
        )

    @classmethod
    def create_pattern_fix_goal(
        cls,
        target: str,
        description: str = "",
    ) -> "ImprovementGoal":
        """Create a pattern-fix goal."""
        return cls(
            id=f"goal-{uuid.uuid4().hex[:8]}",
            type=GoalType.PATTERN_FIX,
            target=target,
            description=description or "Fix recurring failure patterns",
        )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "type": self.type.value,
            "target": self.target,
            "description": self.description,
            "status": self.status.value,
            "metric": {
                "name": self.metric.name,
                "current": self.metric.current,
                "target": self.metric.target,
                "unit": self.metric.unit,
            } if self.metric else None,
            "discovery_count": self.discovery_count,
            "discovered_so_far": self.discovered_so_far,
            "card_ids": self.card_ids,
            "progress": self.progress,
            "created_at": self.created_at.isoformat(),
            "achieved_at": self.achieved_at.isoformat() if self.achieved_at else None,
        }


@dataclass
class TaskReflection:
    """
    Reflection data from a completed task.

    Captured after each task to enable pattern detection and learning.
    """
    task_id: str
    spec_id: str
    project_path: str

    # Outcome metrics
    success: bool
    qa_iterations: int
    total_duration_seconds: float
    phase_durations: dict[str, float] = field(default_factory=dict)

    # Issue analysis
    issues_found: list[str] = field(default_factory=list)
    issue_types: list[str] = field(default_factory=list)  # Categorized
    fixes_applied: list[str] = field(default_factory=list)

    # Learning
    what_worked: list[str] = field(default_factory=list)
    what_failed: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)

    # Metadata
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "task_id": self.task_id,
            "spec_id": self.spec_id,
            "project_path": self.project_path,
            "success": self.success,
            "qa_iterations": self.qa_iterations,
            "total_duration_seconds": self.total_duration_seconds,
            "phase_durations": self.phase_durations,
            "issues_found": self.issues_found,
            "issue_types": self.issue_types,
            "fixes_applied": self.fixes_applied,
            "what_worked": self.what_worked,
            "what_failed": self.what_failed,
            "recommendations": self.recommendations,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class Pattern:
    """
    A detected recurring pattern across tasks.

    When the same type of issue appears 3+ times, we create a Pattern
    and suggest an improvement card to address it.
    """
    id: str
    issue_type: str
    description: str
    occurrences: int
    examples: list[str]
    affected_specs: list[str]
    suggested_fix: str
    severity: str = "medium"  # low, medium, high
    created_at: datetime = field(default_factory=datetime.now)

    @classmethod
    def create(
        cls,
        issue_type: str,
        description: str,
        occurrences: int,
        examples: list[str],
        affected_specs: list[str],
        suggested_fix: str,
    ) -> "Pattern":
        """Factory method."""
        return cls(
            id=f"pattern-{uuid.uuid4().hex[:8]}",
            issue_type=issue_type,
            description=description,
            occurrences=occurrences,
            examples=examples,
            affected_specs=affected_specs,
            suggested_fix=suggested_fix,
            severity="high" if occurrences >= 5 else "medium" if occurrences >= 3 else "low",
        )


@dataclass
class Discovery:
    """
    A discovered external tool, MCP server, or package.

    Found by searching external sources and filtered for relevance
    to the current project's stack.
    """
    id: str
    source: str  # github, npm, mcp_registry, etc.
    name: str
    description: str
    url: str
    relevance_score: float  # 0-1
    relevance_reasons: list[str]

    # For packages
    package_name: Optional[str] = None
    version: Optional[str] = None

    # For MCP servers
    mcp_server_id: Optional[str] = None
    install_command: Optional[str] = None

    # Metadata
    stars: int = 0
    last_updated: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)

    def to_card(self, goal_id: Optional[str] = None) -> ImprovementCard:
        """Convert discovery to an improvement card."""
        return ImprovementCard.create(
            type=CardType.DISCOVERY,
            title=f"New Tool: {self.name}",
            description=self.description,
            evidence=CardEvidence(
                relevance_score=self.relevance_score,
                examples=self.relevance_reasons,
                metrics={"stars": self.stars} if self.stars else {},
            ),
            suggested_action=SuggestedAction(
                type=ActionType.TOOL_INSTALL,
                details=f"Install {self.name} from {self.source}",
                effort=EffortLevel.TRIVIAL if self.install_command else EffortLevel.SMALL,
                command=self.install_command,
            ),
            goal_id=goal_id,
        )


@dataclass
class LoopResult:
    """Result of running an improvement loop."""
    status: str  # "achieved", "max_iterations", "user_stopped"
    iterations: int
    cards_generated: int = 0
    cards_approved: int = 0
    cards_applied: int = 0
    final_metrics: dict[str, float] = field(default_factory=dict)


@dataclass
class ImprovementMetrics:
    """
    Aggregated metrics for the improvement dashboard.

    These metrics track the overall health and improvement trends
    across all tasks in a project.
    """
    # Task metrics
    total_tasks: int = 0
    successful_tasks: int = 0
    failed_tasks: int = 0

    # QA metrics
    avg_qa_iterations: float = 0.0
    total_qa_iterations: int = 0

    # Time metrics
    avg_task_duration_seconds: float = 0.0
    avg_planning_duration: float = 0.0
    avg_coding_duration: float = 0.0
    avg_validation_duration: float = 0.0

    # Pattern metrics
    recurring_patterns_count: int = 0
    patterns_fixed: int = 0

    # Card metrics
    cards_proposed: int = 0
    cards_approved: int = 0
    cards_applied: int = 0
    cards_dismissed: int = 0

    # Goal metrics
    active_goals: int = 0
    achieved_goals: int = 0

    @property
    def success_rate(self) -> float:
        """Task success rate (0-100)."""
        if self.total_tasks == 0:
            return 0.0
        return (self.successful_tasks / self.total_tasks) * 100

    @property
    def card_approval_rate(self) -> float:
        """Card approval rate (0-100)."""
        total = self.cards_approved + self.cards_dismissed
        if total == 0:
            return 0.0
        return (self.cards_approved / total) * 100

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "total_tasks": self.total_tasks,
            "successful_tasks": self.successful_tasks,
            "failed_tasks": self.failed_tasks,
            "success_rate": self.success_rate,
            "avg_qa_iterations": self.avg_qa_iterations,
            "total_qa_iterations": self.total_qa_iterations,
            "avg_task_duration_seconds": self.avg_task_duration_seconds,
            "avg_planning_duration": self.avg_planning_duration,
            "avg_coding_duration": self.avg_coding_duration,
            "avg_validation_duration": self.avg_validation_duration,
            "recurring_patterns_count": self.recurring_patterns_count,
            "patterns_fixed": self.patterns_fixed,
            "cards_proposed": self.cards_proposed,
            "cards_approved": self.cards_approved,
            "cards_applied": self.cards_applied,
            "cards_dismissed": self.cards_dismissed,
            "card_approval_rate": self.card_approval_rate,
            "active_goals": self.active_goals,
            "achieved_goals": self.achieved_goals,
        }
