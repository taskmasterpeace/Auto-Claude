"""
Vercel Fix Loop Orchestration
==============================

Main fix loop that coordinates Vercel deployment monitoring and error fixing.
Mirrors the pattern from qa/loop.py.
"""

import subprocess
from pathlib import Path

from core.client import create_client
from debug import debug, debug_error, debug_section, debug_success, debug_warning
from integrations.vercel import VercelConfig, VercelDeploymentState, is_vercel_enabled
from integrations.vercel.client import VercelClient
from integrations.vercel.parser import BuildLogParser, format_errors_for_fixer
from phase_config import get_phase_model, get_phase_thinking_budget
from task_logger import (
    LogPhase,
    get_task_logger,
)

from .fixer import run_vercel_fixer_session

# Configuration
MAX_VERCEL_FIX_ATTEMPTS = 5
VERCEL_FIX_REQUEST_FILE = "VERCEL_FIX_REQUEST.md"


async def run_vercel_monitor(
    project_dir: Path,
    spec_dir: Path,
    commit_sha: str,
    model: str,
    verbose: bool = False,
) -> bool:
    """
    Monitor Vercel deployment and run fix loop if errors occur.

    This is the main entry point, called after merge to main.

    Args:
        project_dir: Project root directory
        spec_dir: Spec directory
        commit_sha: Git commit SHA that was merged
        model: Claude model to use
        verbose: Whether to show detailed output

    Returns:
        True if deployment succeeded (eventually), False otherwise
    """
    if not is_vercel_enabled():
        debug("vercel_monitor", "Vercel integration not enabled, skipping")
        return True  # Not an error, just not enabled

    debug_section("vercel_monitor", "Vercel Deployment Monitor")
    debug(
        "vercel_monitor",
        "Starting Vercel monitoring",
        commit_sha=commit_sha[:7],
        project_dir=str(project_dir),
    )

    print("\n" + "=" * 70)
    print("  VERCEL DEPLOYMENT MONITOR")
    print("  Checking deployment status...")
    print("=" * 70)

    config = VercelConfig.from_env()

    async with VercelClient(config) as client:
        # Wait for deployment to complete
        state = await client.wait_for_deployment(
            commit_sha,
            poll_interval=config.poll_interval_seconds,
            timeout_minutes=config.poll_timeout_minutes,
        )

        # Save state
        state.save(spec_dir)

        if state.is_ready():
            debug_success("vercel_monitor", "Deployment succeeded")
            print("\n" + "=" * 70)
            print("  ✅ VERCEL DEPLOYMENT SUCCEEDED")
            print("=" * 70)
            print(f"\nDeployment URL: https://{state.url}")
            return True

        if state.is_failed():
            debug_warning("vercel_monitor", "Deployment failed, entering fix loop")
            print("\n" + "-" * 70)
            print("  ⚠️  Vercel build failed. Entering fix loop...")
            print("-" * 70)

            # Run the fix loop
            return await run_vercel_fix_loop(
                project_dir=project_dir,
                spec_dir=spec_dir,
                model=model,
                initial_state=state,
                config=config,
                verbose=verbose,
            )

        # Timeout or cancelled
        debug_error("vercel_monitor", f"Deployment ended with status: {state.status}")
        print(f"\n⚠️  Deployment ended with status: {state.status}")
        print(f"Message: {state.error_message or 'Unknown'}")
        return False


async def run_vercel_fix_loop(
    project_dir: Path,
    spec_dir: Path,
    model: str,
    initial_state: VercelDeploymentState,
    config: VercelConfig,
    verbose: bool = False,
) -> bool:
    """
    Run the Vercel fix loop.

    Similar to QA loop:
    1. Parse build errors
    2. Create VERCEL_FIX_REQUEST.md
    3. Run Vercel Fixer agent
    4. Commit and push (if auto_fix) or wait for user
    5. Wait for new deployment
    6. Repeat until success or max attempts

    Args:
        project_dir: Project root directory
        spec_dir: Spec directory
        model: Claude model to use
        initial_state: Initial deployment state with errors
        config: Vercel configuration
        verbose: Whether to show detailed output

    Returns:
        True if fixes succeeded, False otherwise
    """
    debug_section("vercel_fix_loop", "Vercel Fix Loop")

    print("\n" + "=" * 70)
    print("  VERCEL FIX LOOP")
    print("  Auto-fixing build errors")
    print("=" * 70)

    # Initialize task logger
    task_logger = get_task_logger(spec_dir)

    state = initial_state
    fix_attempt = state.fix_attempts

    while fix_attempt < MAX_VERCEL_FIX_ATTEMPTS:
        fix_attempt += 1

        debug(
            "vercel_fix_loop",
            f"Starting fix attempt {fix_attempt}/{MAX_VERCEL_FIX_ATTEMPTS}",
        )
        print(f"\n--- Fix Attempt {fix_attempt}/{MAX_VERCEL_FIX_ATTEMPTS} ---")

        # Parse errors from the deployment
        parser = BuildLogParser()
        if state.errors:
            # Convert dict errors back to VercelBuildError objects for formatting
            from integrations.vercel.config import VercelBuildError

            errors = [VercelBuildError.from_dict(e) for e in state.errors]
        else:
            errors = []

        if not errors and state.error_message:
            # Fallback: create a generic error from the message
            from integrations.vercel.config import VercelBuildError

            errors = [
                VercelBuildError(
                    error_type="build",
                    message=state.error_message,
                )
            ]

        if not errors:
            debug_warning("vercel_fix_loop", "No errors to fix")
            print("No specific errors found to fix.")
            break

        # Create fix request file
        fix_request_content = format_errors_for_fixer(errors)
        fix_request_content += f"\n\n---\n\n**Fix Attempt**: {fix_attempt}\n"
        fix_request_content += f"**Deployment ID**: {state.deployment_id}\n"
        fix_request_content += f"**Auto-Fix Mode**: {'Enabled' if config.auto_fix_enabled else 'Disabled'}\n"

        fix_request_file = spec_dir / VERCEL_FIX_REQUEST_FILE
        fix_request_file.write_text(fix_request_content)
        debug("vercel_fix_loop", "Created VERCEL_FIX_REQUEST.md")

        # Run Vercel Fixer agent
        fixer_model = get_phase_model(spec_dir, "qa", model)  # Reuse QA model config
        fixer_thinking_budget = get_phase_thinking_budget(spec_dir, "qa")

        print("\nRunning Vercel Fixer Agent...")

        fixer_client = create_client(
            project_dir,
            spec_dir,
            fixer_model,
            agent_type="vercel_fixer",
            max_thinking_tokens=fixer_thinking_budget,
        )

        async with fixer_client:
            fix_status, fix_response = await run_vercel_fixer_session(
                fixer_client, spec_dir, fix_attempt, verbose
            )

        if fix_status == "error":
            debug_error("vercel_fix_loop", f"Fixer error: {fix_response[:200]}")
            print(f"\n❌ Fixer encountered error: {fix_response}")
            state.record_fix_attempt(success=False, errors_fixed=[], error=fix_response)
            state.save(spec_dir)
            continue

        debug_success("vercel_fix_loop", "Fixes applied")
        print("\n✅ Fixes applied.")

        # Handle commit and push based on auto_fix setting
        if config.auto_fix_enabled:
            print("\n🔄 Auto-fix enabled. Committing and pushing changes...")
            if not await _commit_and_push_fixes(project_dir, fix_attempt):
                debug_error("vercel_fix_loop", "Failed to commit and push fixes")
                state.record_fix_attempt(
                    success=False, errors_fixed=[], error="Failed to commit/push"
                )
                state.save(spec_dir)
                continue
        else:
            # Manual mode - wait for user to commit/push
            print("\n📝 Auto-fix disabled. Please review and commit the fixes:")
            print("   1. Review the changes made by the fixer")
            print("   2. Commit: git add -A && git commit -m 'fix: Vercel build errors'")
            print("   3. Push: git push")
            print("\nWaiting for new deployment after you push...")

            # Record attempt
            state.record_fix_attempt(
                success=True, errors_fixed=[e.message for e in errors[:5]]
            )
            state.save(spec_dir)

            # For manual mode, we exit and let the user push
            # They can re-run the merge command or we could watch for new deployments
            print(
                "\nRun the merge command again after pushing to continue monitoring."
            )
            return False

        # Delete the fix request file after processing
        try:
            fix_request_file.unlink()
        except OSError:
            pass

        # Wait for new deployment
        print("\n⏳ Waiting for new Vercel deployment...")

        # Get the new commit SHA after our commit
        new_commit = _get_head_commit(project_dir)

        async with VercelClient(config) as client:
            state = await client.wait_for_deployment(
                new_commit,
                poll_interval=config.poll_interval_seconds,
                timeout_minutes=config.poll_timeout_minutes,
            )

        state.fix_attempts = fix_attempt
        state.save(spec_dir)

        if state.is_ready():
            debug_success("vercel_fix_loop", "Deployment succeeded after fixes")
            print("\n" + "=" * 70)
            print("  ✅ VERCEL DEPLOYMENT SUCCEEDED")
            print(f"  Fixed after {fix_attempt} attempt(s)")
            print("=" * 70)
            print(f"\nDeployment URL: https://{state.url}")

            if task_logger:
                task_logger.end_phase(
                    LogPhase.VALIDATION,
                    success=True,
                    message=f"Vercel build fixed after {fix_attempt} attempt(s)",
                )

            return True

        if state.is_failed():
            debug_warning(
                "vercel_fix_loop", f"Deployment still failing, attempt {fix_attempt}"
            )
            print(f"\n⚠️  Deployment still failing. Trying again...")
            # Loop continues with new errors
            continue

    # Max attempts reached
    debug_error(
        "vercel_fix_loop",
        f"Max fix attempts ({MAX_VERCEL_FIX_ATTEMPTS}) reached",
    )

    print("\n" + "=" * 70)
    print("  ⚠️  VERCEL FIX LOOP INCOMPLETE")
    print("=" * 70)
    print(f"\nReached maximum fix attempts ({MAX_VERCEL_FIX_ATTEMPTS}).")
    print("Manual intervention required.")

    # Create escalation file
    escalation_file = spec_dir / "VERCEL_ESCALATION.md"
    escalation_content = f"""# Vercel Build Fix Escalation

The Vercel fix loop was unable to resolve build errors after {MAX_VERCEL_FIX_ATTEMPTS} attempts.

## Last Known Errors

{format_errors_for_fixer(errors) if errors else 'No specific errors captured.'}

## Fix Attempt History

"""
    for attempt in state.fix_history:
        escalation_content += f"- Attempt {attempt['attempt']}: {'Success' if attempt['success'] else 'Failed'}\n"
        if attempt.get("error"):
            escalation_content += f"  Error: {attempt['error'][:200]}\n"

    escalation_content += """
## Recommended Actions

1. Review the build logs in the Vercel dashboard
2. Check for environment variable issues
3. Verify all dependencies are correctly installed
4. Consider reverting recent changes if the issue persists
"""
    escalation_file.write_text(escalation_content)
    print(f"\nEscalation file created: {escalation_file}")

    if task_logger:
        task_logger.end_phase(
            LogPhase.VALIDATION,
            success=False,
            message=f"Vercel fix loop incomplete after {MAX_VERCEL_FIX_ATTEMPTS} attempts",
        )

    return False


async def _commit_and_push_fixes(project_dir: Path, fix_attempt: int) -> bool:
    """Commit and push the fixes made by the fixer agent."""
    try:
        # Stage all changes
        subprocess.run(
            ["git", "add", "-A"],
            cwd=project_dir,
            check=True,
            capture_output=True,
        )

        # Commit
        commit_message = f"fix: Vercel build errors (auto-fix attempt {fix_attempt})"
        subprocess.run(
            ["git", "commit", "-m", commit_message],
            cwd=project_dir,
            check=True,
            capture_output=True,
        )

        # Push
        subprocess.run(
            ["git", "push"],
            cwd=project_dir,
            check=True,
            capture_output=True,
        )

        return True

    except subprocess.CalledProcessError as e:
        print(f"Git operation failed: {e.stderr.decode() if e.stderr else str(e)}")
        return False


def _get_head_commit(project_dir: Path) -> str:
    """Get the current HEAD commit SHA."""
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=project_dir,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()
