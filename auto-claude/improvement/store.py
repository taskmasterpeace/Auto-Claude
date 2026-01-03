"""
Storage layer for improvement data.

Persists cards, goals, reflections, and metrics to the project's
.auto-claude/improvement/ directory.
"""

from pathlib import Path
from typing import Optional
import json
from datetime import datetime

from .models import (
    ImprovementCard,
    ImprovementGoal,
    TaskReflection,
    Pattern,
    ImprovementMetrics,
    CardStatus,
    GoalStatus,
)


class ImprovementStore:
    """
    Persistent storage for improvement system data.

    Data is stored in:
      .auto-claude/improvement/
        cards.json       - All improvement cards
        goals.json       - All improvement goals
        reflections.json - Task reflections (last 100)
        patterns.json    - Detected patterns
        metrics.json     - Aggregated metrics
    """

    def __init__(self, project_dir: Path):
        self.project_dir = Path(project_dir)
        self.improvement_dir = self.project_dir / ".auto-claude" / "improvement"
        self._ensure_dir()

    def _ensure_dir(self) -> None:
        """Ensure improvement directory exists."""
        self.improvement_dir.mkdir(parents=True, exist_ok=True)

    def _load_json(self, filename: str) -> dict | list:
        """Load JSON file, returning empty dict/list if not exists."""
        filepath = self.improvement_dir / filename
        if not filepath.exists():
            return {} if filename.endswith("s.json") else []
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {} if filename.endswith("s.json") else []

    def _save_json(self, filename: str, data: dict | list) -> None:
        """Save data to JSON file."""
        filepath = self.improvement_dir / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

    # ==================== Cards ====================

    def get_cards(self, status: Optional[CardStatus] = None) -> list[ImprovementCard]:
        """Get all cards, optionally filtered by status."""
        data = self._load_json("cards.json")
        cards_data = data.get("cards", []) if isinstance(data, dict) else data
        cards = [ImprovementCard.from_dict(c) for c in cards_data]

        if status:
            cards = [c for c in cards if c.status == status]

        return sorted(cards, key=lambda c: c.created_at, reverse=True)

    def get_card(self, card_id: str) -> Optional[ImprovementCard]:
        """Get a specific card by ID."""
        cards = self.get_cards()
        for card in cards:
            if card.id == card_id:
                return card
        return None

    def save_card(self, card: ImprovementCard) -> None:
        """Save or update a card."""
        data = self._load_json("cards.json")
        cards_data = data.get("cards", []) if isinstance(data, dict) else data

        # Update existing or append new
        updated = False
        for i, c in enumerate(cards_data):
            if c.get("id") == card.id:
                cards_data[i] = card.to_dict()
                updated = True
                break

        if not updated:
            cards_data.append(card.to_dict())

        self._save_json("cards.json", {"cards": cards_data})

    def update_card_status(self, card_id: str, status: CardStatus) -> Optional[ImprovementCard]:
        """Update a card's status."""
        card = self.get_card(card_id)
        if card:
            if status == CardStatus.APPROVED:
                card.approve()
            elif status == CardStatus.DISMISSED:
                card.dismiss()
            elif status == CardStatus.APPLIED:
                card.apply()
            else:
                card.status = status
                card.updated_at = datetime.now()
            self.save_card(card)
        return card

    def get_cards_for_goal(self, goal_id: str) -> list[ImprovementCard]:
        """Get all cards associated with a goal."""
        return [c for c in self.get_cards() if c.goal_id == goal_id]

    # ==================== Goals ====================

    def get_goals(self, status: Optional[GoalStatus] = None) -> list[ImprovementGoal]:
        """Get all goals, optionally filtered by status."""
        data = self._load_json("goals.json")
        goals_data = data.get("goals", []) if isinstance(data, dict) else data

        goals = []
        for g in goals_data:
            goal = ImprovementGoal(
                id=g["id"],
                type=g["type"],
                target=g["target"],
                description=g["description"],
                status=GoalStatus(g.get("status", "active")),
                discovery_count=g.get("discovery_count", 0),
                discovered_so_far=g.get("discovered_so_far", 0),
                card_ids=g.get("card_ids", []),
                created_at=datetime.fromisoformat(g["created_at"]),
                achieved_at=datetime.fromisoformat(g["achieved_at"]) if g.get("achieved_at") else None,
            )
            if g.get("metric"):
                from .models import GoalMetric, GoalType
                goal.type = GoalType(g["type"])
                goal.metric = GoalMetric(
                    name=g["metric"]["name"],
                    current=g["metric"]["current"],
                    target=g["metric"]["target"],
                    unit=g["metric"]["unit"],
                )
            goals.append(goal)

        if status:
            goals = [g for g in goals if g.status == status]

        return sorted(goals, key=lambda g: g.created_at, reverse=True)

    def get_goal(self, goal_id: str) -> Optional[ImprovementGoal]:
        """Get a specific goal by ID."""
        goals = self.get_goals()
        for goal in goals:
            if goal.id == goal_id:
                return goal
        return None

    def save_goal(self, goal: ImprovementGoal) -> None:
        """Save or update a goal."""
        data = self._load_json("goals.json")
        goals_data = data.get("goals", []) if isinstance(data, dict) else data

        goal_dict = goal.to_dict()

        # Update existing or append new
        updated = False
        for i, g in enumerate(goals_data):
            if g.get("id") == goal.id:
                goals_data[i] = goal_dict
                updated = True
                break

        if not updated:
            goals_data.append(goal_dict)

        self._save_json("goals.json", {"goals": goals_data})

    def add_card_to_goal(self, goal_id: str, card_id: str) -> None:
        """Associate a card with a goal."""
        goal = self.get_goal(goal_id)
        if goal and card_id not in goal.card_ids:
            goal.card_ids.append(card_id)
            self.save_goal(goal)

    # ==================== Reflections ====================

    def get_reflections(self, limit: int = 100) -> list[TaskReflection]:
        """Get recent task reflections."""
        data = self._load_json("reflections.json")
        reflections_data = data.get("reflections", []) if isinstance(data, dict) else data

        reflections = []
        for r in reflections_data:
            reflections.append(TaskReflection(
                task_id=r["task_id"],
                spec_id=r["spec_id"],
                project_path=r["project_path"],
                success=r["success"],
                qa_iterations=r["qa_iterations"],
                total_duration_seconds=r["total_duration_seconds"],
                phase_durations=r.get("phase_durations", {}),
                issues_found=r.get("issues_found", []),
                issue_types=r.get("issue_types", []),
                fixes_applied=r.get("fixes_applied", []),
                what_worked=r.get("what_worked", []),
                what_failed=r.get("what_failed", []),
                recommendations=r.get("recommendations", []),
                created_at=datetime.fromisoformat(r["created_at"]),
            ))

        return sorted(reflections, key=lambda r: r.created_at, reverse=True)[:limit]

    def save_reflection(self, reflection: TaskReflection) -> None:
        """Save a task reflection."""
        data = self._load_json("reflections.json")
        reflections_data = data.get("reflections", []) if isinstance(data, dict) else data

        reflections_data.append(reflection.to_dict())

        # Keep only last 100 reflections
        if len(reflections_data) > 100:
            reflections_data = sorted(
                reflections_data,
                key=lambda r: r.get("created_at", ""),
                reverse=True
            )[:100]

        self._save_json("reflections.json", {"reflections": reflections_data})

    # ==================== Patterns ====================

    def get_patterns(self) -> list[Pattern]:
        """Get all detected patterns."""
        data = self._load_json("patterns.json")
        patterns_data = data.get("patterns", []) if isinstance(data, dict) else data

        patterns = []
        for p in patterns_data:
            patterns.append(Pattern(
                id=p["id"],
                issue_type=p["issue_type"],
                description=p["description"],
                occurrences=p["occurrences"],
                examples=p.get("examples", []),
                affected_specs=p.get("affected_specs", []),
                suggested_fix=p["suggested_fix"],
                severity=p.get("severity", "medium"),
                created_at=datetime.fromisoformat(p["created_at"]),
            ))

        return patterns

    def save_pattern(self, pattern: Pattern) -> None:
        """Save or update a pattern."""
        data = self._load_json("patterns.json")
        patterns_data = data.get("patterns", []) if isinstance(data, dict) else data

        pattern_dict = {
            "id": pattern.id,
            "issue_type": pattern.issue_type,
            "description": pattern.description,
            "occurrences": pattern.occurrences,
            "examples": pattern.examples,
            "affected_specs": pattern.affected_specs,
            "suggested_fix": pattern.suggested_fix,
            "severity": pattern.severity,
            "created_at": pattern.created_at.isoformat(),
        }

        # Update existing or append new
        updated = False
        for i, p in enumerate(patterns_data):
            if p.get("id") == pattern.id:
                patterns_data[i] = pattern_dict
                updated = True
                break

        if not updated:
            patterns_data.append(pattern_dict)

        self._save_json("patterns.json", {"patterns": patterns_data})

    # ==================== Metrics ====================

    def get_metrics(self) -> ImprovementMetrics:
        """Get aggregated improvement metrics."""
        data = self._load_json("metrics.json")
        if not data:
            return ImprovementMetrics()

        return ImprovementMetrics(
            total_tasks=data.get("total_tasks", 0),
            successful_tasks=data.get("successful_tasks", 0),
            failed_tasks=data.get("failed_tasks", 0),
            avg_qa_iterations=data.get("avg_qa_iterations", 0.0),
            total_qa_iterations=data.get("total_qa_iterations", 0),
            avg_task_duration_seconds=data.get("avg_task_duration_seconds", 0.0),
            avg_planning_duration=data.get("avg_planning_duration", 0.0),
            avg_coding_duration=data.get("avg_coding_duration", 0.0),
            avg_validation_duration=data.get("avg_validation_duration", 0.0),
            recurring_patterns_count=data.get("recurring_patterns_count", 0),
            patterns_fixed=data.get("patterns_fixed", 0),
            cards_proposed=data.get("cards_proposed", 0),
            cards_approved=data.get("cards_approved", 0),
            cards_applied=data.get("cards_applied", 0),
            cards_dismissed=data.get("cards_dismissed", 0),
            active_goals=data.get("active_goals", 0),
            achieved_goals=data.get("achieved_goals", 0),
        )

    def save_metrics(self, metrics: ImprovementMetrics) -> None:
        """Save aggregated metrics."""
        self._save_json("metrics.json", metrics.to_dict())

    def recalculate_metrics(self) -> ImprovementMetrics:
        """Recalculate metrics from reflections and cards."""
        reflections = self.get_reflections()
        cards = self.get_cards()
        goals = self.get_goals()
        patterns = self.get_patterns()

        metrics = ImprovementMetrics()

        # Task metrics
        metrics.total_tasks = len(reflections)
        metrics.successful_tasks = sum(1 for r in reflections if r.success)
        metrics.failed_tasks = metrics.total_tasks - metrics.successful_tasks

        # QA metrics
        if reflections:
            qa_iters = [r.qa_iterations for r in reflections]
            metrics.avg_qa_iterations = sum(qa_iters) / len(qa_iters)
            metrics.total_qa_iterations = sum(qa_iters)

            # Duration metrics
            durations = [r.total_duration_seconds for r in reflections if r.total_duration_seconds > 0]
            if durations:
                metrics.avg_task_duration_seconds = sum(durations) / len(durations)

            # Phase durations
            planning_durations = [r.phase_durations.get("planning", 0) for r in reflections]
            coding_durations = [r.phase_durations.get("coding", 0) for r in reflections]
            validation_durations = [r.phase_durations.get("validation", 0) for r in reflections]

            if planning_durations:
                metrics.avg_planning_duration = sum(planning_durations) / len(planning_durations)
            if coding_durations:
                metrics.avg_coding_duration = sum(coding_durations) / len(coding_durations)
            if validation_durations:
                metrics.avg_validation_duration = sum(validation_durations) / len(validation_durations)

        # Pattern metrics
        metrics.recurring_patterns_count = len(patterns)

        # Card metrics
        metrics.cards_proposed = sum(1 for c in cards if c.status == CardStatus.PROPOSED)
        metrics.cards_approved = sum(1 for c in cards if c.status == CardStatus.APPROVED)
        metrics.cards_applied = sum(1 for c in cards if c.status == CardStatus.APPLIED)
        metrics.cards_dismissed = sum(1 for c in cards if c.status == CardStatus.DISMISSED)

        # Goal metrics
        metrics.active_goals = sum(1 for g in goals if g.status == GoalStatus.ACTIVE)
        metrics.achieved_goals = sum(1 for g in goals if g.status == GoalStatus.ACHIEVED)

        self.save_metrics(metrics)
        return metrics
