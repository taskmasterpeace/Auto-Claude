"""
Simple Task Mode (Ralph Wiggum-style Autonomous Loops)
======================================================

Provides a simplified iteration loop for mechanical tasks that don't
need the full spec/plan pipeline. The agent iterates on a prompt until
the completion promise (a shell command) exits with code 0.

Example usage:
    python run.py --simple "Fix all TypeScript errors" \
        --completion-promise "npx tsc --noEmit" \
        --simple-max-iterations 20
"""

import asyncio
import subprocess
import platform
import sys
from pathlib import Path

from core.client import create_client
from agents.coder import run_agent_session
from debug import debug, debug_error, debug_section, debug_success, debug_warning


def evaluate_promise(
    project_dir: Path,
    promise: str,
    timeout_seconds: int = 300
) -> tuple[bool, str]:
    """
    Run the completion promise command and check if it succeeds.

    Args:
        project_dir: Directory to run command in
        promise: Shell command that must exit 0
        timeout_seconds: Max time to wait

    Returns:
        Tuple of (success: bool, output: str)
    """
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                promise,
                shell=True,
                cwd=project_dir,
                capture_output=True,
                timeout=timeout_seconds,
                text=True
            )
        else:
            result = subprocess.run(
                promise,
                shell=True,
                cwd=project_dir,
                capture_output=True,
                timeout=timeout_seconds,
                text=True,
                executable="/bin/bash"
            )

        output = result.stdout + result.stderr
        return result.returncode == 0, output

    except subprocess.TimeoutExpired:
        return False, f"Command timed out after {timeout_seconds} seconds"
    except Exception as e:
        return False, f"Error running command: {e}"


async def run_simple_task_loop(
    project_dir: Path,
    prompt: str,
    completion_promise: str,
    max_iterations: int = 30,
    model: str = "sonnet",
    verbose: bool = False
) -> bool:
    """
    Ralph Wiggum-style iteration loop.

    Single agent, single prompt, iterate until completion promise is met.
    No spec.md, no implementation_plan.json - just raw iteration.

    Args:
        project_dir: Project root directory
        prompt: The task prompt for the agent
        completion_promise: Shell command that must exit 0
        max_iterations: Maximum iterations before giving up
        model: Claude model to use
        verbose: Enable verbose output

    Returns:
        True if completion promise was satisfied, False otherwise
    """
    debug_section("simple_loop", "Simple Task Mode (Ralph Wiggum Style)")
    debug(
        "simple_loop",
        "Starting simple task loop",
        project_dir=str(project_dir),
        prompt=prompt[:100],
        promise=completion_promise,
        max_iterations=max_iterations,
        model=model,
    )

    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        print(f"\n{'='*60}")
        print(f"  ITERATION {iteration}/{max_iterations}")
        print(f"{'='*60}")

        # Create a fresh client for each iteration
        # No spec_dir needed for simple mode - work directly in project
        client = create_client(
            project_dir=project_dir,
            spec_dir=None,  # No spec for simple mode
            model=model,
            agent_type="coder",  # Use coder agent
        )

        # Build the prompt with iteration context
        full_prompt = f"""
{prompt}

---

## Simple Task Mode - Iteration {iteration}/{max_iterations}

You are in Simple Task Mode. Your goal is to make changes that satisfy the completion promise.

**COMPLETION PROMISE:**
The following command must exit with code 0:
```
{completion_promise}
```

Work toward making this command pass. When you believe you're done making changes,
the system will automatically run the command to verify.

**Tips:**
- Focus on the specific changes needed to make the command pass
- You can run the command yourself to check progress
- If stuck, try a different approach
- Small, incremental changes are often better than large rewrites
"""

        debug(
            "simple_loop",
            f"Running iteration {iteration}",
            prompt_length=len(full_prompt),
        )

        try:
            async with client:
                status, response = await run_agent_session(
                    client,
                    full_prompt,
                    verbose=verbose,
                )

            debug(
                "simple_loop",
                f"Iteration {iteration} completed",
                status=status,
                response_length=len(response),
            )

        except Exception as e:
            debug_error("simple_loop", f"Iteration {iteration} failed: {e}")
            print(f"\n❌ Agent session error: {e}")
            # Continue to check promise anyway - agent might have made progress
            pass

        # Check completion promise
        print(f"\n{'='*60}")
        print("  CHECKING COMPLETION PROMISE")
        print(f"{'='*60}")
        print(f"Command: {completion_promise}")

        success, output = evaluate_promise(project_dir, completion_promise)

        if success:
            debug_success(
                "simple_loop",
                "Completion promise satisfied!",
                iteration=iteration,
            )
            print(f"\n{'='*60}")
            print("  ✅ COMPLETION PROMISE SATISFIED!")
            print(f"{'='*60}")
            print(f"\nCompleted in {iteration} iteration(s)")
            return True
        else:
            debug_warning(
                "simple_loop",
                f"Promise not met in iteration {iteration}",
                output=output[:200],
            )
            print(f"\n❌ Promise not yet met (exit code non-zero)")
            if output:
                # Show truncated output
                print(f"\nOutput preview:")
                print(output[:500])
                if len(output) > 500:
                    print("... (truncated)")
            print(f"\n⏳ Continuing to iteration {iteration + 1}...")

    # Max iterations reached
    debug_error(
        "simple_loop",
        "Max iterations reached without satisfying promise",
        max_iterations=max_iterations,
    )
    print(f"\n{'='*60}")
    print("  ❌ MAX ITERATIONS REACHED")
    print(f"{'='*60}")
    print(f"\nReached maximum iterations ({max_iterations}) without satisfying the completion promise.")
    print(f"\nCompletion promise: {completion_promise}")
    print("\nThe task may require manual intervention or a different approach.")

    return False


def handle_simple_command(
    project_dir: Path,
    prompt: str,
    completion_promise: str,
    max_iterations: int,
    model: str,
    verbose: bool = False,
) -> None:
    """
    Handle the --simple CLI command.

    This is the entry point from main.py for simple task mode.
    """
    print("\n" + "=" * 60)
    print("  SIMPLE TASK MODE")
    print("  Ralph Wiggum-style Autonomous Loops")
    print("=" * 60)
    print(f"\nPrompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    print(f"Completion Promise: {completion_promise}")
    print(f"Max Iterations: {max_iterations}")
    print(f"Model: {model}")
    print(f"Project: {project_dir}")

    # Validate completion promise by running it once
    print("\n📋 Validating completion promise command...")
    success, output = evaluate_promise(project_dir, completion_promise)

    if success:
        print("\n✅ Completion promise already satisfied!")
        print("   No work needed - the command already passes.")
        sys.exit(0)

    print(f"   Command exits with non-zero code (expected)")
    print(f"   Starting iteration loop to fix...")

    # Run the async loop
    success = asyncio.run(
        run_simple_task_loop(
            project_dir=project_dir,
            prompt=prompt,
            completion_promise=completion_promise,
            max_iterations=max_iterations,
            model=model,
            verbose=verbose,
        )
    )

    sys.exit(0 if success else 1)
