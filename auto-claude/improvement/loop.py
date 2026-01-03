"""
Improvement Loop Runner for Auto Claude Self-Improvement.

Implements the QA-style loop pattern for self-improvement:
ANALYZE → PROPOSE → VALIDATE → (repeat until goal met)
"""

from pathlib import Path
from typing import Optional
from datetime import datetime
from enum import Enum
import asyncio

from .models import (
    ImprovementGoal,
    ImprovementCard,
    LoopResult,
    GoalStatus,
    GoalType,
    CardStatus,
)
from .store import ImprovementStore
from .reflection import ReflectionEngine
from .discovery.search import DiscoveryEngine
from .discovery.sources import SourceType


class LoopStatus(str, Enum):
    """Status of an improvement loop iteration."""
    ANALYZING = "analyzing"
    PROPOSING = "proposing"
    AWAITING_USER = "awaiting_user"
    VALIDATING = "validating"
    PROGRESSING = "progressing"
    ACHIEVED = "achieved"
    STALLED = "stalled"


class ImprovementLoop:
    """
    Improvement loop runner using the QA validation pattern.

    The loop:
    1. ANALYZE: Gather current metrics and state
    2. CHECK: Is the goal achieved?
    3. PROPOSE: Generate improvement cards
    4. AWAIT: User reviews and approves/dismisses cards
    5. VALIDATE: Check if approved cards moved us closer to goal
    6. REPEAT: Until goal achieved or max iterations
    """

    DEFAULT_MAX_ITERATIONS = 10

    def __init__(self, project_dir: Path, github_token: Optional[str] = None):
        self.project_dir = Path(project_dir)
        self.store = ImprovementStore(project_dir)
        self.reflection_engine = ReflectionEngine(project_dir)
        self.discovery_engine = DiscoveryEngine(project_dir, github_token)

    async def run(
        self,
        goal: ImprovementGoal,
        max_iterations: int = None,
    ) -> LoopResult:
        """
        Run the improvement loop until goal is achieved or max iterations reached.

        Args:
            goal: The improvement goal to work toward
            max_iterations: Maximum loop iterations (default: 10)

        Returns:
            LoopResult with status and iteration count
        """
        if max_iterations is None:
            max_iterations = self.DEFAULT_MAX_ITERATIONS

        iteration = 0
        previous_metrics = None

        # Save the goal
        self.store.save_goal(goal)

        while iteration < max_iterations:
            iteration += 1
            print(f"\n[Improvement Loop] Iteration {iteration}/{max_iterations}")

            # 1. ANALYZE: Gather current metrics
            current_metrics = self._gather_metrics(goal)
            print(f"[Improvement Loop] Current metrics: {current_metrics}")

            # 2. CHECK: Is goal achieved?
            if self._is_goal_achieved(goal, current_metrics):
                goal.status = GoalStatus.ACHIEVED
                goal.achieved_at = datetime.now()
                self.store.save_goal(goal)
                return LoopResult(
                    status="achieved",
                    iterations=iteration,
                    final_metrics=current_metrics,
                    message=f"Goal '{goal.target}' achieved in {iteration} iterations",
                )

            # 3. PROPOSE: Generate improvement cards
            cards = await self._propose_cards(goal, current_metrics)
            print(f"[Improvement Loop] Proposed {len(cards)} cards")

            if not cards:
                # No new cards to propose, check if we have pending ones
                pending_cards = [
                    c for c in self.store.get_cards_for_goal(goal.id)
                    if c.status == CardStatus.PROPOSED
                ]
                if not pending_cards:
                    return LoopResult(
                        status="no_proposals",
                        iterations=iteration,
                        final_metrics=current_metrics,
                        message="No improvement proposals could be generated",
                    )

            # 4. AWAIT USER: Cards are now in "proposed" status
            # In a real implementation, this would pause and wait for user action
            # For now, we return and let the UI handle user interaction
            return LoopResult(
                status="awaiting_user",
                iterations=iteration,
                final_metrics=current_metrics,
                cards_proposed=len(cards),
                message=f"Proposed {len(cards)} improvement cards for user review",
            )

            # Note: The loop would continue after user approves/dismisses cards
            # This is handled by resume_after_user_action()

        # Max iterations reached
        return LoopResult(
            status="max_iterations",
            iterations=iteration,
            final_metrics=current_metrics,
            message=f"Max iterations ({max_iterations}) reached without achieving goal",
        )

    async def resume_after_user_action(
        self,
        goal: ImprovementGoal,
        iteration: int,
        max_iterations: int = None,
    ) -> LoopResult:
        """
        Resume the improvement loop after user has reviewed cards.

        Args:
            goal: The improvement goal
            iteration: Current iteration number
            max_iterations: Maximum iterations

        Returns:
            LoopResult with next status
        """
        if max_iterations is None:
            max_iterations = self.DEFAULT_MAX_ITERATIONS

        # 5. VALIDATE: Check if approved cards moved us closer to goal
        current_metrics = self._gather_metrics(goal)

        # Check for progress
        approved_cards = [
            c for c in self.store.get_cards_for_goal(goal.id)
            if c.status == CardStatus.APPROVED
        ]

        if self._is_goal_achieved(goal, current_metrics):
            goal.status = GoalStatus.ACHIEVED
            goal.achieved_at = datetime.now()
            self.store.save_goal(goal)
            return LoopResult(
                status="achieved",
                iterations=iteration,
                final_metrics=current_metrics,
                message=f"Goal '{goal.target}' achieved!",
            )

        if not approved_cards:
            # No cards approved, check if we're stalled
            dismissed_cards = [
                c for c in self.store.get_cards_for_goal(goal.id)
                if c.status == CardStatus.DISMISSED
            ]
            if len(dismissed_cards) > 5:
                return LoopResult(
                    status="stalled",
                    iterations=iteration,
                    final_metrics=current_metrics,
                    message="Multiple proposals dismissed, consider revising goal",
                )

        # Continue the loop
        return await self.run(goal, max_iterations - iteration)

    def _gather_metrics(self, goal: ImprovementGoal) -> dict:
        """Gather metrics relevant to the goal."""
        metrics = self.store.recalculate_metrics()

        if goal.type == GoalType.METRIC:
            if goal.metric:
                metric_name = goal.metric.name
                if metric_name == "avg_qa_iterations":
                    return {"value": metrics.avg_qa_iterations}
                elif metric_name == "success_rate":
                    if metrics.total_tasks > 0:
                        return {"value": metrics.successful_tasks / metrics.total_tasks}
                    return {"value": 0}
                elif metric_name == "avg_task_duration":
                    return {"value": metrics.avg_task_duration_seconds}

        elif goal.type == GoalType.DISCOVERY:
            # Count discoveries for this goal
            cards = self.store.get_cards_for_goal(goal.id)
            discovery_cards = [c for c in cards if "discovery" in c.type.value.lower() or "Discovery" in c.title]
            return {
                "discovered": len(discovery_cards),
                "approved": len([c for c in discovery_cards if c.status == CardStatus.APPROVED]),
                "applied": len([c for c in discovery_cards if c.status == CardStatus.APPLIED]),
            }

        elif goal.type == GoalType.PATTERN_FIX:
            patterns = self.store.get_patterns()
            return {
                "patterns_found": len(patterns),
                "high_severity": len([p for p in patterns if p.severity == "high"]),
            }

        return {}

    def _is_goal_achieved(self, goal: ImprovementGoal, metrics: dict) -> bool:
        """Check if the goal has been achieved based on current metrics."""
        if goal.type == GoalType.METRIC and goal.metric:
            current_value = metrics.get("value", 0)
            target_value = goal.metric.target

            # For metrics where lower is better (like QA iterations)
            if goal.metric.name in ["avg_qa_iterations", "avg_task_duration"]:
                return current_value <= target_value
            else:
                # For metrics where higher is better (like success rate)
                return current_value >= target_value

        elif goal.type == GoalType.DISCOVERY:
            discovered = metrics.get("discovered", 0)
            goal.discovered_so_far = discovered
            self.store.save_goal(goal)
            return discovered >= goal.discovery_count

        elif goal.type == GoalType.PATTERN_FIX:
            # Goal achieved when high severity patterns are addressed
            high_severity = metrics.get("high_severity", 0)
            return high_severity == 0

        return False

    async def _propose_cards(
        self,
        goal: ImprovementGoal,
        current_metrics: dict,
    ) -> list[ImprovementCard]:
        """Propose improvement cards based on the goal type."""
        cards = []

        if goal.type == GoalType.METRIC and goal.metric:
            # Use reflection engine to propose metric improvements
            cards = self.reflection_engine.propose_for_metric(
                metric_name=goal.metric.name,
                current_value=current_metrics.get("value", 0),
                target_value=goal.metric.target,
            )
            # Associate cards with goal
            for card in cards:
                card.goal_id = goal.id
                self.store.save_card(card)

        elif goal.type == GoalType.DISCOVERY:
            # Use discovery engine to find tools
            cards = await self.discovery_engine.search_for_goal(
                goal_type="mcp_servers" if "mcp" in goal.target.lower() else "tools",
                target_count=goal.discovery_count - current_metrics.get("discovered", 0),
            )
            # Associate cards with goal
            for card in cards:
                card.goal_id = goal.id
                self.store.save_card(card)

        elif goal.type == GoalType.PATTERN_FIX:
            # Get existing patterns and create cards for high-severity ones
            patterns = self.store.get_patterns()
            high_severity = [p for p in patterns if p.severity == "high"]

            for pattern in high_severity:
                # Check if we already have a card for this pattern
                existing = [
                    c for c in self.store.get_cards()
                    if pattern.issue_type in c.title.lower()
                    and c.status in [CardStatus.PROPOSED, CardStatus.APPROVED]
                ]
                if not existing:
                    card = self.reflection_engine._create_card_from_pattern(pattern)
                    card.goal_id = goal.id
                    self.store.save_card(card)
                    cards.append(card)

        return cards


async def run_improvement_loop(
    project_dir: Path,
    goal: ImprovementGoal,
    max_iterations: int = 10,
    github_token: Optional[str] = None,
) -> LoopResult:
    """
    Convenience function to run an improvement loop.

    Args:
        project_dir: Path to the project directory
        goal: The improvement goal to work toward
        max_iterations: Maximum loop iterations
        github_token: Optional GitHub token for discovery

    Returns:
        LoopResult with status and details
    """
    loop = ImprovementLoop(project_dir, github_token)
    return await loop.run(goal, max_iterations)


def create_metric_goal(
    metric_name: str,
    target: float,
    description: str = None,
) -> ImprovementGoal:
    """
    Create a metric-based improvement goal.

    Args:
        metric_name: Name of the metric (e.g., "avg_qa_iterations")
        target: Target value for the metric
        description: Optional goal description

    Returns:
        ImprovementGoal configured for the metric
    """
    from .models import GoalMetric
    import uuid

    return ImprovementGoal(
        id=f"goal_{uuid.uuid4().hex[:12]}",
        type=GoalType.METRIC,
        target=f"Improve {metric_name}",
        description=description or f"Achieve {metric_name} of {target}",
        metric=GoalMetric(
            name=metric_name,
            current=0,  # Will be calculated
            target=target,
            unit="",
        ),
    )


def create_discovery_goal(
    discovery_type: str,
    count: int,
    description: str = None,
) -> ImprovementGoal:
    """
    Create a discovery-based improvement goal.

    Args:
        discovery_type: Type of discovery (e.g., "mcp_servers", "tools")
        count: Number of items to discover
        description: Optional goal description

    Returns:
        ImprovementGoal configured for discovery
    """
    import uuid

    return ImprovementGoal(
        id=f"goal_{uuid.uuid4().hex[:12]}",
        type=GoalType.DISCOVERY,
        target=f"Discover {count} {discovery_type}",
        description=description or f"Find {count} relevant {discovery_type} for this project",
        discovery_count=count,
    )


def create_pattern_fix_goal(description: str = None) -> ImprovementGoal:
    """
    Create a pattern-fix improvement goal.

    Args:
        description: Optional goal description

    Returns:
        ImprovementGoal configured for pattern fixes
    """
    import uuid

    return ImprovementGoal(
        id=f"goal_{uuid.uuid4().hex[:12]}",
        type=GoalType.PATTERN_FIX,
        target="Fix recurring issues",
        description=description or "Address high-severity recurring patterns",
    )
