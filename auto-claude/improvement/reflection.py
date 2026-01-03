"""
Reflection Engine for Auto Claude Self-Improvement.

Analyzes completed tasks for improvement opportunities by:
- Gathering metrics from task execution
- Detecting recurring patterns across tasks
- Generating improvement cards with evidence
"""

from pathlib import Path
from typing import Optional
from datetime import datetime
import uuid

from .models import (
    ImprovementCard,
    TaskReflection,
    Pattern,
    CardType,
    CardStatus,
    ActionType,
    EffortLevel,
    CardEvidence,
    SuggestedAction,
)
from .store import ImprovementStore
from .metrics import gather_task_metrics, create_task_reflection


class ReflectionEngine:
    """
    Engine for post-task reflection and improvement card generation.

    Analyzes completed tasks to:
    1. Extract metrics and insights
    2. Detect recurring patterns
    3. Generate actionable improvement cards
    """

    # Minimum occurrences to consider a pattern recurring
    PATTERN_THRESHOLD = 3

    # Similarity threshold for grouping issues (0-1)
    SIMILARITY_THRESHOLD = 0.8

    def __init__(self, project_dir: Path):
        self.project_dir = Path(project_dir)
        self.store = ImprovementStore(project_dir)

    async def run_post_task_reflection(
        self,
        spec_dir: Path,
        what_worked: list[str] = None,
        what_failed: list[str] = None,
        recommendations: list[str] = None,
    ) -> TaskReflection:
        """
        Run reflection after a task completes.

        Args:
            spec_dir: Path to the spec directory
            what_worked: Things that worked well (from session memory)
            what_failed: Things that didn't work (from session memory)
            recommendations: Recommendations for future tasks

        Returns:
            The created TaskReflection
        """
        # Create and save reflection
        reflection = create_task_reflection(
            spec_dir=spec_dir,
            project_path=str(self.project_dir),
            what_worked=what_worked,
            what_failed=what_failed,
            recommendations=recommendations,
        )
        self.store.save_reflection(reflection)

        # Check for patterns and generate cards
        await self._analyze_and_generate_cards(reflection)

        # Update metrics
        self.store.recalculate_metrics()

        return reflection

    async def _analyze_and_generate_cards(self, reflection: TaskReflection) -> list[ImprovementCard]:
        """
        Analyze reflection and generate improvement cards if patterns detected.
        """
        cards = []

        # Get recent reflections for pattern detection
        reflections = self.store.get_reflections(limit=50)

        # Detect patterns
        patterns = self._detect_patterns(reflections)

        # Generate cards for significant patterns
        for pattern in patterns:
            # Check if we already have an active card for this pattern
            existing_cards = self.store.get_cards()
            has_active = any(
                c.status in [CardStatus.PROPOSED, CardStatus.APPROVED]
                and pattern.issue_type in c.title.lower()
                for c in existing_cards
            )

            if not has_active:
                card = self._create_card_from_pattern(pattern)
                self.store.save_card(card)
                self.store.save_pattern(pattern)
                cards.append(card)

        # Generate cards from high QA iterations
        if reflection.qa_iterations >= 3:
            card = self._create_high_qa_card(reflection)
            self.store.save_card(card)
            cards.append(card)

        return cards

    def _detect_patterns(self, reflections: list[TaskReflection]) -> list[Pattern]:
        """
        Detect recurring patterns across reflections.

        Groups similar issues and identifies patterns that occur
        at least PATTERN_THRESHOLD times.
        """
        patterns = []

        # Group by issue type
        issue_groups = {}
        for r in reflections:
            for issue_type in r.issue_types:
                if issue_type not in issue_groups:
                    issue_groups[issue_type] = []
                issue_groups[issue_type].append({
                    "spec_id": r.spec_id,
                    "issues": [i for i in r.issues_found if i.get("type") == issue_type],
                })

        # Create patterns for recurring issues
        for issue_type, occurrences in issue_groups.items():
            if len(occurrences) >= self.PATTERN_THRESHOLD:
                examples = []
                affected_specs = []

                for occ in occurrences[:5]:  # Keep up to 5 examples
                    affected_specs.append(occ["spec_id"])
                    if occ["issues"]:
                        examples.append(occ["issues"][0].get("description", ""))

                pattern = Pattern(
                    id=f"pattern_{issue_type}_{uuid.uuid4().hex[:8]}",
                    issue_type=issue_type,
                    description=f"Recurring {issue_type.replace('_', ' ')} issues detected",
                    occurrences=len(occurrences),
                    examples=examples,
                    affected_specs=affected_specs,
                    suggested_fix=self._suggest_fix_for_pattern(issue_type),
                    severity=self._calculate_severity(issue_type, len(occurrences)),
                )
                patterns.append(pattern)

        return patterns

    def _suggest_fix_for_pattern(self, issue_type: str) -> str:
        """Generate a suggested fix based on the issue type."""
        suggestions = {
            "type_error": "Add TypeScript strict mode checks, improve type definitions, consider adding runtime type validation",
            "runtime_error": "Add error boundary handling, improve null checks, add defensive coding patterns",
            "test_failure": "Review test coverage, ensure tests match implementation, add integration tests",
            "lint_error": "Configure pre-commit hooks, add ESLint/Prettier auto-fix, update linting rules",
            "missing_feature": "Improve spec clarity, add acceptance criteria checklist, validate requirements upfront",
            "performance": "Add performance benchmarks, profile slow operations, implement caching",
            "security": "Run security scanner, add input validation, review authentication/authorization",
        }
        return suggestions.get(issue_type, "Review and address the recurring issue pattern")

    def _calculate_severity(self, issue_type: str, occurrences: int) -> str:
        """Calculate severity based on issue type and frequency."""
        high_severity_types = ["security", "runtime_error", "type_error"]
        medium_severity_types = ["test_failure", "missing_feature"]

        if issue_type in high_severity_types or occurrences >= 5:
            return "high"
        elif issue_type in medium_severity_types or occurrences >= 3:
            return "medium"
        return "low"

    def _create_card_from_pattern(self, pattern: Pattern) -> ImprovementCard:
        """Create an improvement card from a detected pattern."""
        return ImprovementCard(
            id=f"card_{uuid.uuid4().hex[:12]}",
            type=CardType.REFLECTION,
            title=f"Fix recurring {pattern.issue_type.replace('_', ' ')} issues",
            description=(
                f"Detected {pattern.occurrences} occurrences of {pattern.issue_type.replace('_', ' ')} "
                f"across {len(pattern.affected_specs)} tasks. This pattern suggests a systemic issue "
                f"that could be addressed with improved practices or tooling."
            ),
            evidence=CardEvidence(
                occurrences=pattern.occurrences,
                examples=pattern.examples,
            ),
            suggested_action=SuggestedAction(
                type=ActionType.PROMPT_UPDATE,
                details=pattern.suggested_fix,
                effort=EffortLevel.MEDIUM,
            ),
            status=CardStatus.PROPOSED,
        )

    def _create_high_qa_card(self, reflection: TaskReflection) -> ImprovementCard:
        """Create a card for tasks with high QA iteration count."""
        return ImprovementCard(
            id=f"card_{uuid.uuid4().hex[:12]}",
            type=CardType.REFLECTION,
            title=f"Reduce QA iterations for {reflection.spec_id}",
            description=(
                f"Task {reflection.spec_id} required {reflection.qa_iterations} QA iterations. "
                f"Consider reviewing the issues encountered to prevent similar problems."
            ),
            evidence=CardEvidence(
                occurrences=reflection.qa_iterations,
                examples=[f"{it}: found in task" for it in reflection.issue_types[:3]],
            ),
            suggested_action=SuggestedAction(
                type=ActionType.PROMPT_UPDATE,
                details=(
                    f"Review the {len(reflection.issue_types)} issue types encountered: "
                    f"{', '.join(reflection.issue_types)}. Consider adding validation checks "
                    f"for these issue types in the planning or coding phases."
                ),
                effort=EffortLevel.SMALL,
            ),
            status=CardStatus.PROPOSED,
        )

    def propose_for_metric(
        self,
        metric_name: str,
        current_value: float,
        target_value: float,
    ) -> list[ImprovementCard]:
        """
        Propose improvement cards to help achieve a metric goal.

        Args:
            metric_name: Name of the metric to improve
            current_value: Current metric value
            target_value: Target metric value

        Returns:
            List of proposed improvement cards
        """
        cards = []

        if metric_name == "avg_qa_iterations":
            if current_value > target_value:
                # Analyze what's causing high QA iterations
                reflections = self.store.get_reflections(limit=20)
                high_qa_tasks = [r for r in reflections if r.qa_iterations >= 3]

                if high_qa_tasks:
                    # Aggregate issue types from high-QA tasks
                    issue_counts = {}
                    for r in high_qa_tasks:
                        for it in r.issue_types:
                            issue_counts[it] = issue_counts.get(it, 0) + 1

                    top_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:3]

                    card = ImprovementCard(
                        id=f"card_{uuid.uuid4().hex[:12]}",
                        type=CardType.OPTIMIZATION,
                        title="Reduce QA iterations by addressing top issues",
                        description=(
                            f"Current avg QA iterations: {current_value:.1f}, Target: {target_value:.1f}. "
                            f"Top issue types in high-iteration tasks: {', '.join(t for t, _ in top_issues)}"
                        ),
                        evidence=CardEvidence(
                            occurrences=len(high_qa_tasks),
                            examples=[f"{t}: {c} occurrences" for t, c in top_issues],
                            metrics={"current_avg": current_value, "target": target_value},
                        ),
                        suggested_action=SuggestedAction(
                            type=ActionType.PROMPT_UPDATE,
                            details=(
                                f"Add validation checks for: {', '.join(t for t, _ in top_issues)}. "
                                "Consider adding a pre-QA self-check phase."
                            ),
                            effort=EffortLevel.MEDIUM,
                        ),
                        status=CardStatus.PROPOSED,
                    )
                    cards.append(card)
                    self.store.save_card(card)

        elif metric_name == "success_rate":
            if current_value < target_value:
                # Analyze failures
                reflections = self.store.get_reflections(limit=20)
                failed_tasks = [r for r in reflections if not r.success]

                if failed_tasks:
                    common_failures = {}
                    for r in failed_tasks:
                        for wf in r.what_failed:
                            common_failures[wf] = common_failures.get(wf, 0) + 1

                    card = ImprovementCard(
                        id=f"card_{uuid.uuid4().hex[:12]}",
                        type=CardType.OPTIMIZATION,
                        title="Improve success rate by addressing failure patterns",
                        description=(
                            f"Current success rate: {current_value:.1%}, Target: {target_value:.1%}. "
                            f"Found {len(failed_tasks)} failed tasks in recent history."
                        ),
                        evidence=CardEvidence(
                            occurrences=len(failed_tasks),
                            examples=list(common_failures.keys())[:5],
                            metrics={"current_rate": current_value, "target": target_value},
                        ),
                        suggested_action=SuggestedAction(
                            type=ActionType.PROMPT_UPDATE,
                            details="Review failed tasks and add safeguards for common failure modes.",
                            effort=EffortLevel.LARGE,
                        ),
                        status=CardStatus.PROPOSED,
                    )
                    cards.append(card)
                    self.store.save_card(card)

        return cards


async def run_post_task_reflection(
    spec_dir: Path,
    project_dir: Path,
    success: bool = None,
    what_worked: list[str] = None,
    what_failed: list[str] = None,
    recommendations: list[str] = None,
) -> TaskReflection:
    """
    Convenience function to run post-task reflection.

    This is the main entry point called after task completion.
    Can be called with just success=True/False and it will load
    the relevant data from the spec's session memory.

    Args:
        spec_dir: Path to the spec directory
        project_dir: Path to the project directory
        success: Whether the task succeeded (QA approved)
        what_worked: Things that worked well (optional, loaded from memory if not provided)
        what_failed: Things that didn't work (optional, loaded from memory if not provided)
        recommendations: Recommendations for future tasks (optional)
    """
    # Try to load session insights if not provided
    if what_worked is None or what_failed is None:
        memory_dir = spec_dir / "memory"
        insights_file = memory_dir / "session_insights.md"

        if insights_file.exists():
            try:
                content = insights_file.read_text(encoding="utf-8")

                # Parse what worked
                if what_worked is None:
                    what_worked = []
                    if "## What Worked" in content:
                        section = content.split("## What Worked")[1]
                        section = section.split("##")[0] if "##" in section else section
                        for line in section.strip().split("\n"):
                            line = line.strip()
                            if line.startswith("- "):
                                what_worked.append(line[2:])

                # Parse what failed
                if what_failed is None:
                    what_failed = []
                    if "## What Failed" in content or "## Issues Encountered" in content:
                        for marker in ["## What Failed", "## Issues Encountered"]:
                            if marker in content:
                                section = content.split(marker)[1]
                                section = section.split("##")[0] if "##" in section else section
                                for line in section.strip().split("\n"):
                                    line = line.strip()
                                    if line.startswith("- "):
                                        what_failed.append(line[2:])
                                break

                # Parse recommendations
                if recommendations is None:
                    recommendations = []
                    if "## Recommendations" in content:
                        section = content.split("## Recommendations")[1]
                        section = section.split("##")[0] if "##" in section else section
                        for line in section.strip().split("\n"):
                            line = line.strip()
                            if line.startswith("- "):
                                recommendations.append(line[2:])
            except Exception:
                pass  # Fallback to empty lists

    # Add success/failure context based on outcome
    if success is not None:
        if what_worked is None:
            what_worked = []
        if what_failed is None:
            what_failed = []

        if success:
            if not any("qa approved" in w.lower() for w in what_worked):
                what_worked.append("Build passed QA validation")
        else:
            if not any("qa" in f.lower() for f in what_failed):
                what_failed.append("Build did not pass QA validation")

    engine = ReflectionEngine(project_dir)
    return await engine.run_post_task_reflection(
        spec_dir=spec_dir,
        what_worked=what_worked or [],
        what_failed=what_failed or [],
        recommendations=recommendations or [],
    )
