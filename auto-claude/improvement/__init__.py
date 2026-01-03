"""
Auto Claude Self-Improvement System

A hybrid system combining:
- Self-Reflection: Learn from task outcomes, detect recurring patterns
- Tool Discovery: Search for relevant MCP servers, plugins, and packages
- Improvement Loop: Iterate toward goals using the proven QA loop pattern

All improvements generate cards that require user approval before action.
"""

from .models import (
    ImprovementCard,
    ImprovementGoal,
    TaskReflection,
    Pattern,
    Discovery,
    LoopResult,
    ImprovementMetrics,
    CardType,
    CardStatus,
    ActionType,
    EffortLevel,
    GoalType,
    GoalStatus,
    GoalMetric,
)
from .store import ImprovementStore
from .metrics import gather_task_metrics, create_task_reflection, get_metrics_summary
from .reflection import ReflectionEngine, run_post_task_reflection
from .loop import (
    ImprovementLoop,
    run_improvement_loop,
    create_metric_goal,
    create_discovery_goal,
    create_pattern_fix_goal,
)
from .discovery import DiscoveryEngine, DiscoverySources

__all__ = [
    # Models
    "ImprovementCard",
    "ImprovementGoal",
    "TaskReflection",
    "Pattern",
    "Discovery",
    "LoopResult",
    "ImprovementMetrics",
    "CardType",
    "CardStatus",
    "ActionType",
    "EffortLevel",
    "GoalType",
    "GoalStatus",
    "GoalMetric",
    # Store
    "ImprovementStore",
    # Metrics
    "gather_task_metrics",
    "create_task_reflection",
    "get_metrics_summary",
    # Reflection
    "ReflectionEngine",
    "run_post_task_reflection",
    # Loop
    "ImprovementLoop",
    "run_improvement_loop",
    "create_metric_goal",
    "create_discovery_goal",
    "create_pattern_fix_goal",
    # Discovery
    "DiscoveryEngine",
    "DiscoverySources",
]
