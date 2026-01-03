"""
Vercel Fixer Agent Session
===========================

Runs Vercel fixer sessions to resolve build errors.
Mirrors the pattern from qa/fixer.py.
"""

from pathlib import Path

from claude_agent_sdk import ClaudeSDKClient
from debug import debug, debug_detailed, debug_error, debug_section, debug_success
from task_logger import (
    LogEntryType,
    LogPhase,
    get_task_logger,
)

# Configuration
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
VERCEL_FIX_REQUEST_FILE = "VERCEL_FIX_REQUEST.md"


def load_vercel_fixer_prompt() -> str:
    """Load the Vercel fixer agent prompt."""
    prompt_file = PROMPTS_DIR / "vercel_fixer.md"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Vercel fixer prompt not found: {prompt_file}")
    return prompt_file.read_text()


async def run_vercel_fixer_session(
    client: ClaudeSDKClient,
    spec_dir: Path,
    fix_session: int,
    verbose: bool = False,
) -> tuple[str, str]:
    """
    Run a Vercel fixer agent session.

    Args:
        client: Claude SDK client
        spec_dir: Spec directory
        fix_session: Fix iteration number
        verbose: Whether to show detailed output

    Returns:
        (status, response_text) where status is:
        - "fixed" if fixes were applied
        - "error" if an error occurred
    """
    debug_section("vercel_fixer", f"Vercel Fixer Session {fix_session}")
    debug(
        "vercel_fixer",
        "Starting Vercel fixer session",
        spec_dir=str(spec_dir),
        fix_session=fix_session,
    )

    print(f"\n{'=' * 70}")
    print(f"  VERCEL FIXER SESSION {fix_session}")
    print("  Applying fixes from VERCEL_FIX_REQUEST.md...")
    print(f"{'=' * 70}\n")

    # Get task logger for streaming markers
    task_logger = get_task_logger(spec_dir)
    current_tool = None
    message_count = 0
    tool_count = 0

    # Check that fix request file exists
    fix_request_file = spec_dir / VERCEL_FIX_REQUEST_FILE
    if not fix_request_file.exists():
        debug_error("vercel_fixer", "VERCEL_FIX_REQUEST.md not found")
        return "error", "VERCEL_FIX_REQUEST.md not found"

    # Load fixer prompt
    prompt = load_vercel_fixer_prompt()
    debug_detailed("vercel_fixer", "Loaded Vercel fixer prompt", prompt_length=len(prompt))

    # Add session context - use full path so agent can find files
    prompt += f"\n\n---\n\n**Fix Session**: {fix_session}\n"
    prompt += f"**Spec Directory**: {spec_dir}\n"
    prompt += f"**Spec Name**: {spec_dir.name}\n"
    prompt += f"\n**IMPORTANT**: All spec files are located in: `{spec_dir}/`\n"
    prompt += f"The fix request file is at: `{spec_dir}/VERCEL_FIX_REQUEST.md`\n"

    try:
        debug("vercel_fixer", "Sending query to Claude SDK...")
        await client.query(prompt)
        debug_success("vercel_fixer", "Query sent successfully")

        response_text = ""
        debug("vercel_fixer", "Starting to receive response stream...")
        async for msg in client.receive_response():
            msg_type = type(msg).__name__
            message_count += 1
            debug_detailed(
                "vercel_fixer",
                f"Received message #{message_count}",
                msg_type=msg_type,
            )

            if msg_type == "AssistantMessage" and hasattr(msg, "content"):
                for block in msg.content:
                    block_type = type(block).__name__

                    if block_type == "TextBlock" and hasattr(block, "text"):
                        response_text += block.text
                        print(block.text, end="", flush=True)
                        # Log text to task logger (persist without double-printing)
                        if task_logger and block.text.strip():
                            task_logger.log(
                                block.text,
                                LogEntryType.TEXT,
                                LogPhase.VALIDATION,
                                print_to_console=False,
                            )
                    elif block_type == "ToolUseBlock" and hasattr(block, "name"):
                        tool_name = block.name
                        tool_input = None
                        tool_count += 1

                        if hasattr(block, "input") and block.input:
                            inp = block.input
                            if isinstance(inp, dict):
                                if "file_path" in inp:
                                    fp = inp["file_path"]
                                    if len(fp) > 50:
                                        fp = "..." + fp[-47:]
                                    tool_input = fp
                                elif "command" in inp:
                                    cmd = inp["command"]
                                    if len(cmd) > 50:
                                        cmd = cmd[:47] + "..."
                                    tool_input = cmd

                        debug(
                            "vercel_fixer",
                            f"Tool call #{tool_count}: {tool_name}",
                            tool_input=tool_input,
                        )

                        # Log tool start (handles printing)
                        if task_logger:
                            task_logger.tool_start(
                                tool_name,
                                tool_input,
                                LogPhase.VALIDATION,
                                print_to_console=True,
                            )
                        else:
                            print(f"\n[Vercel Fixer Tool: {tool_name}]", flush=True)

                        if verbose and hasattr(block, "input"):
                            input_str = str(block.input)
                            if len(input_str) > 300:
                                print(f"   Input: {input_str[:300]}...", flush=True)
                            else:
                                print(f"   Input: {input_str}", flush=True)
                        current_tool = tool_name

            elif msg_type == "UserMessage" and hasattr(msg, "content"):
                for block in msg.content:
                    block_type = type(block).__name__

                    if block_type == "ToolResultBlock":
                        is_error = getattr(block, "is_error", False)
                        result_content = getattr(block, "content", "")

                        if is_error:
                            debug_error(
                                "vercel_fixer",
                                f"Tool error: {current_tool}",
                                error=str(result_content)[:200],
                            )
                            error_str = str(result_content)[:500]
                            print(f"   [Error] {error_str}", flush=True)
                            if task_logger and current_tool:
                                task_logger.tool_end(
                                    current_tool,
                                    success=False,
                                    result=error_str[:100],
                                    detail=str(result_content),
                                    phase=LogPhase.VALIDATION,
                                )
                        else:
                            debug_detailed(
                                "vercel_fixer",
                                f"Tool success: {current_tool}",
                                result_length=len(str(result_content)),
                            )
                            if verbose:
                                result_str = str(result_content)[:200]
                                print(f"   [Done] {result_str}", flush=True)
                            else:
                                print("   [Done]", flush=True)
                            if task_logger and current_tool:
                                detail_content = None
                                if current_tool in (
                                    "Read",
                                    "Grep",
                                    "Bash",
                                    "Edit",
                                    "Write",
                                ):
                                    result_str = str(result_content)
                                    if len(result_str) < 50000:
                                        detail_content = result_str
                                task_logger.tool_end(
                                    current_tool,
                                    success=True,
                                    detail=detail_content,
                                    phase=LogPhase.VALIDATION,
                                )

                        current_tool = None

        print("\n" + "-" * 70 + "\n")

        debug(
            "vercel_fixer",
            "Fixer session completed",
            message_count=message_count,
            tool_count=tool_count,
            response_length=len(response_text),
        )
        debug_success("vercel_fixer", "Fixes applied")
        return "fixed", response_text

    except Exception as e:
        debug_error(
            "vercel_fixer",
            f"Fixer session exception: {e}",
            exception_type=type(e).__name__,
        )
        print(f"Error during fixer session: {e}")
        if task_logger:
            task_logger.log_error(f"Vercel fixer error: {e}", LogPhase.VALIDATION)
        return "error", str(e)
