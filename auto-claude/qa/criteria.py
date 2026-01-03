"""
QA Acceptance Criteria Handling
================================

Manages acceptance criteria validation and status tracking.
"""

import json
from pathlib import Path

from progress import is_build_complete

# =============================================================================
# IMPLEMENTATION PLAN I/O
# =============================================================================


def load_implementation_plan(spec_dir: Path) -> dict | None:
    """Load the implementation plan JSON."""
    plan_file = spec_dir / "implementation_plan.json"
    if not plan_file.exists():
        return None
    try:
        with open(plan_file) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


def save_implementation_plan(spec_dir: Path, plan: dict) -> bool:
    """Save the implementation plan JSON."""
    plan_file = spec_dir / "implementation_plan.json"
    try:
        with open(plan_file, "w") as f:
            json.dump(plan, f, indent=2)
        return True
    except OSError:
        return False


# =============================================================================
# QA SIGN-OFF STATUS
# =============================================================================


def get_qa_signoff_status(spec_dir: Path) -> dict | None:
    """Get the current QA sign-off status from implementation plan."""
    plan = load_implementation_plan(spec_dir)
    if not plan:
        return None
    return plan.get("qa_signoff")


def is_qa_approved(spec_dir: Path) -> bool:
    """Check if QA has approved the build."""
    status = get_qa_signoff_status(spec_dir)
    if not status:
        return False
    return status.get("status") == "approved"


def is_qa_rejected(spec_dir: Path) -> bool:
    """Check if QA has rejected the build (needs fixes)."""
    status = get_qa_signoff_status(spec_dir)
    if not status:
        return False
    return status.get("status") == "rejected"


def is_question_pending(spec_dir: Path) -> bool:
    """Check if QA has a clarifying question pending for the user."""
    status = get_qa_signoff_status(spec_dir)
    if not status:
        return False
    return status.get("status") == "question_pending"


def get_pending_question(spec_dir: Path) -> dict | None:
    """
    Get the pending QA question details.

    Returns a dict with:
    - context: What the QA agent is reviewing
    - question: The actual question
    - reason: Why the agent can't decide autonomously
    - options: Optional predefined answer options (list)
    - timestamp: When the question was asked

    Returns None if no question is pending or file doesn't exist.
    """
    if not is_question_pending(spec_dir):
        return None

    question_file = spec_dir / "QA_QUESTION.md"
    if not question_file.exists():
        return None

    try:
        content = question_file.read_text(encoding="utf-8")
        return parse_qa_question(content)
    except OSError:
        return None


def parse_qa_question(content: str) -> dict:
    """
    Parse QA_QUESTION.md content into structured data.

    Expected format:
    ```
    # QA Clarifying Question

    ## Context
    [context text]

    ## Question
    [question text]

    ## Why I'm Asking
    [reason text]

    ## Options (optional)
    1. Option one
    2. Option two
    ```
    """
    from datetime import datetime

    result = {
        "context": "",
        "question": "",
        "reason": "",
        "options": [],
        "timestamp": datetime.now().isoformat(),
    }

    current_section = None
    section_content = []

    for line in content.split("\n"):
        line_stripped = line.strip()

        # Detect section headers
        if line_stripped.startswith("## Context"):
            if current_section:
                _save_section(result, current_section, section_content)
            current_section = "context"
            section_content = []
        elif line_stripped.startswith("## Question"):
            if current_section:
                _save_section(result, current_section, section_content)
            current_section = "question"
            section_content = []
        elif line_stripped.startswith("## Why") or line_stripped.startswith("## Reason"):
            if current_section:
                _save_section(result, current_section, section_content)
            current_section = "reason"
            section_content = []
        elif line_stripped.startswith("## Options"):
            if current_section:
                _save_section(result, current_section, section_content)
            current_section = "options"
            section_content = []
        elif line_stripped.startswith("# "):
            # Main title, skip
            continue
        elif line_stripped.startswith("---"):
            # Separator, skip
            continue
        elif current_section:
            section_content.append(line)

    # Save final section
    if current_section:
        _save_section(result, current_section, section_content)

    return result


def _save_section(result: dict, section: str, content: list[str]) -> None:
    """Helper to save parsed section content."""
    text = "\n".join(content).strip()

    if section == "options":
        # Parse numbered list into options array
        options = []
        for line in content:
            line = line.strip()
            # Match patterns like "1. Option", "2) Option", "- Option"
            if line and (line[0].isdigit() or line.startswith("-")):
                # Remove leading number/bullet
                for char in "0123456789.-) ":
                    if line and line[0] == char:
                        line = line[1:]
                    else:
                        break
                line = line.strip()
                if line:
                    options.append(line)
        result["options"] = options
    else:
        result[section] = text


def is_fixes_applied(spec_dir: Path) -> bool:
    """Check if fixes have been applied and ready for re-validation."""
    status = get_qa_signoff_status(spec_dir)
    if not status:
        return False
    return status.get("status") == "fixes_applied" and status.get(
        "ready_for_qa_revalidation", False
    )


def get_qa_iteration_count(spec_dir: Path) -> int:
    """Get the number of QA iterations so far."""
    status = get_qa_signoff_status(spec_dir)
    if not status:
        return 0
    return status.get("qa_session", 0)


# =============================================================================
# QA READINESS CHECKS
# =============================================================================


def should_run_qa(spec_dir: Path) -> bool:
    """
    Determine if QA validation should run.

    QA should run when:
    - All subtasks are completed
    - QA has not yet approved
    """
    if not is_build_complete(spec_dir):
        return False

    if is_qa_approved(spec_dir):
        return False

    return True


def should_run_fixes(spec_dir: Path) -> bool:
    """
    Determine if QA fixes should run.

    Fixes should run when:
    - QA has rejected the build
    - Max iterations not reached
    """
    from .loop import MAX_QA_ITERATIONS

    if not is_qa_rejected(spec_dir):
        return False

    iterations = get_qa_iteration_count(spec_dir)
    if iterations >= MAX_QA_ITERATIONS:
        return False

    return True


# =============================================================================
# STATUS DISPLAY
# =============================================================================


def print_qa_status(spec_dir: Path) -> None:
    """Print the current QA status."""
    from .report import get_iteration_history, get_recurring_issue_summary

    status = get_qa_signoff_status(spec_dir)

    if not status:
        print("QA Status: Not started")
        return

    qa_status = status.get("status", "unknown")
    qa_session = status.get("qa_session", 0)
    timestamp = status.get("timestamp", "unknown")

    print(f"QA Status: {qa_status.upper()}")
    print(f"QA Sessions: {qa_session}")
    print(f"Last Updated: {timestamp}")

    if qa_status == "approved":
        tests = status.get("tests_passed", {})
        print(
            f"Tests: Unit {tests.get('unit', '?')}, Integration {tests.get('integration', '?')}, E2E {tests.get('e2e', '?')}"
        )
    elif qa_status == "rejected":
        issues = status.get("issues_found", [])
        print(f"Issues Found: {len(issues)}")
        for issue in issues[:3]:  # Show first 3
            print(
                f"  - {issue.get('title', 'Unknown')}: {issue.get('type', 'unknown')}"
            )
        if len(issues) > 3:
            print(f"  ... and {len(issues) - 3} more")

    # Show iteration history summary
    history = get_iteration_history(spec_dir)
    if history:
        summary = get_recurring_issue_summary(history)
        print("\nIteration History:")
        print(f"  Total iterations: {len(history)}")
        print(f"  Approved: {summary.get('iterations_approved', 0)}")
        print(f"  Rejected: {summary.get('iterations_rejected', 0)}")
        if summary.get("most_common"):
            print("  Most common issues:")
            for issue in summary["most_common"][:3]:
                print(f"    - {issue['title']} ({issue['occurrences']} occurrences)")


# =============================================================================
# COMPLETION PROMISE EVALUATION (Ralph Wiggum-style)
# =============================================================================


def load_completion_promise(spec_dir: Path) -> str | None:
    """
    Load completion promise from task metadata.

    Returns the shell command(s) that must exit 0 for the task to be complete.
    Multiple commands can be combined with && (all must pass).
    """
    metadata_file = spec_dir / "task_metadata.json"
    if not metadata_file.exists():
        return None

    try:
        with open(metadata_file) as f:
            metadata = json.load(f)
        return metadata.get("completionPromise")
    except (OSError, json.JSONDecodeError):
        return None


def get_max_iterations(spec_dir: Path, default: int = 50) -> int:
    """Get max iterations from task metadata or use default."""
    metadata_file = spec_dir / "task_metadata.json"
    if not metadata_file.exists():
        return default

    try:
        with open(metadata_file) as f:
            metadata = json.load(f)
        return metadata.get("maxIterations", default)
    except (OSError, json.JSONDecodeError):
        return default


def evaluate_completion_promise(
    project_dir: Path,
    promise: str,
    timeout_seconds: int = 300
) -> tuple[bool, str]:
    """
    Evaluate a completion promise by running the command(s).

    Args:
        project_dir: Directory to run commands in
        promise: Shell command(s) to run (can include && for multiple)
        timeout_seconds: Max time to wait for command

    Returns:
        Tuple of (success: bool, output: str)
        - success: True if command exited with code 0
        - output: stdout/stderr from command
    """
    import subprocess
    import platform

    print(f"\n{'='*60}")
    print("  EVALUATING COMPLETION PROMISE")
    print(f"{'='*60}")
    print(f"Command: {promise}")
    print(f"Working directory: {project_dir}")

    try:
        # Use shell=True to support && chains
        # On Windows, use cmd.exe; on Unix, use default shell
        shell_cmd = promise
        if platform.system() == "Windows":
            # Windows needs cmd /c for && chains
            result = subprocess.run(
                shell_cmd,
                shell=True,
                cwd=project_dir,
                capture_output=True,
                timeout=timeout_seconds,
                text=True
            )
        else:
            result = subprocess.run(
                shell_cmd,
                shell=True,
                cwd=project_dir,
                capture_output=True,
                timeout=timeout_seconds,
                text=True,
                executable="/bin/bash"
            )

        output = result.stdout + result.stderr
        success = result.returncode == 0

        if success:
            print(f"\n✅ COMPLETION PROMISE SATISFIED (exit code 0)")
        else:
            print(f"\n❌ COMPLETION PROMISE FAILED (exit code {result.returncode})")
            if output:
                # Show first 500 chars of output
                print(f"Output: {output[:500]}")
                if len(output) > 500:
                    print("... (truncated)")

        return success, output

    except subprocess.TimeoutExpired:
        msg = f"Command timed out after {timeout_seconds} seconds"
        print(f"\n⏱️  {msg}")
        return False, msg
    except Exception as e:
        msg = f"Error running command: {e}"
        print(f"\n❌ {msg}")
        return False, msg


def check_completion_promise(
    project_dir: Path,
    spec_dir: Path
) -> tuple[bool, str]:
    """
    Check if the completion promise for a task is satisfied.

    This is the main entry point for completion promise evaluation.
    It loads the promise from task metadata and evaluates it.

    Returns:
        Tuple of (satisfied: bool, message: str)
    """
    promise = load_completion_promise(spec_dir)

    if not promise:
        # No completion promise configured - rely on QA approval only
        return True, "No completion promise configured"

    return evaluate_completion_promise(project_dir, promise)


def save_promise_result(spec_dir: Path, satisfied: bool, output: str) -> None:
    """Save the last completion promise evaluation result."""
    result_file = spec_dir / "completion_promise_result.json"
    from datetime import datetime

    result = {
        "satisfied": satisfied,
        "output": output[:2000],  # Limit stored output
        "timestamp": datetime.now().isoformat(),
    }

    try:
        with open(result_file, "w") as f:
            json.dump(result, f, indent=2)
    except OSError:
        pass  # Non-critical, ignore errors
