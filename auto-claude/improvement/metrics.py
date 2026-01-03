"""
Metrics gathering for Auto Claude Self-Improvement.

Collects metrics from completed tasks including:
- QA iteration counts
- Time per phase
- Success/failure rates
- Issue types and frequencies
"""

from pathlib import Path
from typing import Optional
from datetime import datetime
import json

from .models import TaskReflection


def gather_task_metrics(spec_dir: Path) -> dict:
    """
    Gather metrics from a completed task's spec directory.

    Args:
        spec_dir: Path to the spec directory containing implementation_plan.json, qa_report.md, etc.

    Returns:
        Dictionary of gathered metrics
    """
    metrics = {
        "spec_id": spec_dir.name,
        "gathered_at": datetime.now().isoformat(),
        "qa_iterations": 0,
        "success": False,
        "total_duration_seconds": 0,
        "phase_durations": {},
        "issues_found": [],
        "issue_types": [],
        "fixes_applied": [],
    }

    # Read implementation plan for status and phase info
    plan_file = spec_dir / "implementation_plan.json"
    if plan_file.exists():
        try:
            with open(plan_file, "r", encoding="utf-8") as f:
                plan = json.load(f)

            # Extract QA signoff info
            qa_signoff = plan.get("qa_signoff", {})
            metrics["qa_iterations"] = qa_signoff.get("iterations", 0)
            metrics["success"] = qa_signoff.get("status") == "approved"

            # Extract phase timing if available
            phases = plan.get("phases", [])
            for phase in phases:
                phase_name = phase.get("name", "unknown")
                if "started_at" in phase and "completed_at" in phase:
                    try:
                        started = datetime.fromisoformat(phase["started_at"])
                        completed = datetime.fromisoformat(phase["completed_at"])
                        duration = (completed - started).total_seconds()
                        metrics["phase_durations"][phase_name] = duration
                    except (ValueError, TypeError):
                        pass

            # Calculate total duration from phases
            if metrics["phase_durations"]:
                metrics["total_duration_seconds"] = sum(metrics["phase_durations"].values())

            # Extract subtask statuses
            subtasks = plan.get("subtasks", [])
            completed_count = sum(1 for s in subtasks if s.get("status") == "completed")
            failed_count = sum(1 for s in subtasks if s.get("status") == "failed")
            metrics["subtask_stats"] = {
                "total": len(subtasks),
                "completed": completed_count,
                "failed": failed_count,
            }

        except (json.JSONDecodeError, IOError) as e:
            metrics["parse_errors"] = [f"implementation_plan.json: {e}"]

    # Read QA report for issues
    qa_report_file = spec_dir / "qa_report.md"
    if qa_report_file.exists():
        try:
            with open(qa_report_file, "r", encoding="utf-8") as f:
                qa_content = f.read()

            issues = parse_qa_issues(qa_content)
            metrics["issues_found"] = issues
            metrics["issue_types"] = list(set(i.get("type", "unknown") for i in issues))

        except IOError as e:
            metrics.setdefault("parse_errors", []).append(f"qa_report.md: {e}")

    # Read QA fix request for applied fixes
    fix_request_file = spec_dir / "QA_FIX_REQUEST.md"
    if fix_request_file.exists():
        try:
            with open(fix_request_file, "r", encoding="utf-8") as f:
                fix_content = f.read()

            fixes = parse_fix_requests(fix_content)
            metrics["fixes_applied"] = fixes

        except IOError as e:
            metrics.setdefault("parse_errors", []).append(f"QA_FIX_REQUEST.md: {e}")

    return metrics


def parse_qa_issues(qa_content: str) -> list[dict]:
    """
    Parse issues from QA report content.

    Returns list of issue dictionaries with type, description, severity.
    """
    issues = []
    current_section = None

    for line in qa_content.split("\n"):
        line = line.strip()

        # Detect section headers
        if line.startswith("## ") or line.startswith("### "):
            current_section = line.lstrip("#").strip().lower()

        # Look for issue indicators
        if any(marker in line.lower() for marker in ["❌", "fail", "error", "issue", "problem", "bug"]):
            issue_type = categorize_issue(line, current_section)
            issues.append({
                "type": issue_type,
                "description": line,
                "section": current_section,
            })

        # Look for bullet points under failure sections
        if current_section and "fail" in current_section.lower():
            if line.startswith("- ") or line.startswith("* "):
                issue_type = categorize_issue(line, current_section)
                issues.append({
                    "type": issue_type,
                    "description": line[2:].strip(),
                    "section": current_section,
                })

    return issues


def categorize_issue(description: str, section: Optional[str] = None) -> str:
    """
    Categorize an issue based on its description.

    Returns one of: type_error, runtime_error, test_failure, lint_error,
                    missing_feature, performance, security, other
    """
    desc_lower = description.lower()

    # Type errors
    if any(k in desc_lower for k in ["type error", "typescript", "typing", "type '", "cannot assign"]):
        return "type_error"

    # Runtime errors
    if any(k in desc_lower for k in ["runtime", "exception", "crash", "undefined", "null reference"]):
        return "runtime_error"

    # Test failures
    if any(k in desc_lower for k in ["test fail", "assertion", "expect", "should have"]):
        return "test_failure"

    # Lint errors
    if any(k in desc_lower for k in ["lint", "eslint", "prettier", "format", "style"]):
        return "lint_error"

    # Missing features
    if any(k in desc_lower for k in ["missing", "not implemented", "todo", "incomplete"]):
        return "missing_feature"

    # Performance
    if any(k in desc_lower for k in ["slow", "performance", "memory", "timeout"]):
        return "performance"

    # Security
    if any(k in desc_lower for k in ["security", "vulnerability", "unsafe", "injection"]):
        return "security"

    return "other"


def parse_fix_requests(fix_content: str) -> list[dict]:
    """
    Parse applied fixes from QA_FIX_REQUEST.md content.

    Returns list of fix dictionaries.
    """
    fixes = []
    current_fix = None

    for line in fix_content.split("\n"):
        line = line.strip()

        # Look for numbered fixes or headers
        if line.startswith("## ") or (line and line[0].isdigit() and "." in line[:3]):
            if current_fix:
                fixes.append(current_fix)
            current_fix = {
                "title": line.lstrip("#0123456789. ").strip(),
                "details": [],
            }
        elif current_fix and line:
            current_fix["details"].append(line)

    if current_fix:
        fixes.append(current_fix)

    return fixes


def create_task_reflection(
    spec_dir: Path,
    project_path: str,
    what_worked: list[str] = None,
    what_failed: list[str] = None,
    recommendations: list[str] = None,
) -> TaskReflection:
    """
    Create a TaskReflection from gathered metrics.

    Args:
        spec_dir: Path to the spec directory
        project_path: Path to the project
        what_worked: Optional list of things that worked well
        what_failed: Optional list of things that didn't work
        recommendations: Optional list of recommendations for future tasks

    Returns:
        TaskReflection object ready for storage
    """
    metrics = gather_task_metrics(spec_dir)

    # Generate task_id from spec_id and timestamp
    task_id = f"{metrics['spec_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    return TaskReflection(
        task_id=task_id,
        spec_id=metrics["spec_id"],
        project_path=project_path,
        success=metrics["success"],
        qa_iterations=metrics["qa_iterations"],
        total_duration_seconds=metrics["total_duration_seconds"],
        phase_durations=metrics["phase_durations"],
        issues_found=metrics["issues_found"],
        issue_types=metrics["issue_types"],
        fixes_applied=metrics["fixes_applied"],
        what_worked=what_worked or [],
        what_failed=what_failed or [],
        recommendations=recommendations or [],
    )


def get_metrics_summary(project_dir: Path, limit: int = 10) -> dict:
    """
    Get a summary of recent metrics across tasks.

    Args:
        project_dir: Path to the project directory
        limit: Maximum number of recent tasks to include

    Returns:
        Summary dictionary with aggregated metrics
    """
    from .store import ImprovementStore

    store = ImprovementStore(project_dir)
    reflections = store.get_reflections(limit=limit)

    if not reflections:
        return {
            "total_tasks": 0,
            "success_rate": 0.0,
            "avg_qa_iterations": 0.0,
            "common_issue_types": [],
            "avg_duration_seconds": 0.0,
        }

    successful = sum(1 for r in reflections if r.success)
    qa_iters = [r.qa_iterations for r in reflections]
    durations = [r.total_duration_seconds for r in reflections if r.total_duration_seconds > 0]

    # Count issue types
    issue_type_counts = {}
    for r in reflections:
        for issue_type in r.issue_types:
            issue_type_counts[issue_type] = issue_type_counts.get(issue_type, 0) + 1

    # Sort by frequency
    common_issues = sorted(issue_type_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "total_tasks": len(reflections),
        "success_rate": successful / len(reflections) if reflections else 0.0,
        "avg_qa_iterations": sum(qa_iters) / len(qa_iters) if qa_iters else 0.0,
        "common_issue_types": [{"type": t, "count": c} for t, c in common_issues[:5]],
        "avg_duration_seconds": sum(durations) / len(durations) if durations else 0.0,
    }
