"""
Vercel Build Log Parser
=======================

Extracts actionable error information from Vercel build logs.
Parses TypeScript, ESLint, Next.js, and other common error formats.
"""

import re
from typing import Optional

from .config import VercelBuildError


class BuildLogParser:
    """
    Parser for Vercel build logs.

    Recognizes and extracts structured information from common error formats:
    - TypeScript errors (TS2xxx codes)
    - ESLint errors
    - Next.js build errors
    - npm/pnpm/yarn errors
    - Generic build failures
    """

    # Regex patterns for common error formats
    PATTERNS = {
        # TypeScript: ./src/file.ts:10:5 - error TS2345: ...
        "typescript": re.compile(
            r"\.?/?(?P<file>[^\s:]+\.[tj]sx?):(?P<line>\d+):(?P<col>\d+)\s*[-–]\s*error\s+(?P<code>TS\d+):\s*(?P<message>.+)",
            re.IGNORECASE,
        ),
        # ESLint: /path/file.js:10:5: Error: ...
        "eslint": re.compile(
            r"(?P<file>[^\s:]+\.[tj]sx?):(?P<line>\d+):(?P<col>\d+):\s*(?P<severity>Error|Warning):\s*(?P<message>.+)",
            re.IGNORECASE,
        ),
        # Next.js build error
        "nextjs": re.compile(
            r"(?:Error|Failed)\s+(?:to\s+)?(?:compile|build)[:\s]+(?P<message>.+)",
            re.IGNORECASE,
        ),
        # Module not found
        "module_not_found": re.compile(
            r"Module\s+not\s+found:\s*(?:Can't\s+resolve\s+)?['\"]?(?P<module>[^'\"]+)['\"]?\s*(?:in\s+['\"]?(?P<file>[^'\"]+)['\"]?)?",
            re.IGNORECASE,
        ),
        # npm/pnpm/yarn errors
        "package_manager": re.compile(
            r"(?:npm|pnpm|yarn)\s+(?:ERR!|error)\s*(?P<message>.+)",
            re.IGNORECASE,
        ),
        # Generic error with file path
        "generic_file_error": re.compile(
            r"(?P<file>[^\s:]+\.[a-z]+):(?P<line>\d+)(?::(?P<col>\d+))?\s*[:\-]\s*(?P<message>.+)",
            re.IGNORECASE,
        ),
    }

    def __init__(self):
        self.errors: list[VercelBuildError] = []

    def parse_events(self, events: list[dict]) -> list[VercelBuildError]:
        """
        Parse Vercel deployment events to extract errors.

        Args:
            events: List of deployment event objects from Vercel API

        Returns:
            List of structured VercelBuildError objects
        """
        self.errors = []
        log_lines: list[str] = []

        # Extract all log lines
        for event in events:
            event_type = event.get("type", "")
            payload = event.get("payload", {})

            if event_type in ("stdout", "stderr"):
                text = payload.get("text", "")
                if text:
                    log_lines.append(text)

            # Direct error events
            if event_type == "error":
                error_msg = payload.get("text", "") or payload.get("error", "")
                if error_msg:
                    self.errors.append(
                        VercelBuildError(
                            error_type="build",
                            message=error_msg.strip(),
                            context=str(payload)[:300],
                        )
                    )

        # Parse log lines for errors
        full_log = "\n".join(log_lines)
        self._parse_log_text(full_log)

        # Deduplicate errors
        return self._deduplicate_errors()

    def parse_log_text(self, log_text: str) -> list[VercelBuildError]:
        """
        Parse raw log text to extract errors.

        Args:
            log_text: Raw build log text

        Returns:
            List of structured VercelBuildError objects
        """
        self.errors = []
        self._parse_log_text(log_text)
        return self._deduplicate_errors()

    def _parse_log_text(self, log_text: str) -> None:
        """Internal method to parse log text and populate self.errors."""
        lines = log_text.split("\n")

        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            # Try each pattern
            error = self._try_parse_line(line, lines, i)
            if error:
                self.errors.append(error)

    def _try_parse_line(
        self, line: str, all_lines: list[str], line_index: int
    ) -> Optional[VercelBuildError]:
        """Try to parse a single line with all known patterns."""

        # TypeScript errors
        match = self.PATTERNS["typescript"].search(line)
        if match:
            return VercelBuildError(
                error_type="typescript",
                message=match.group("message").strip(),
                file_path=match.group("file"),
                line_number=int(match.group("line")),
                column=int(match.group("col")),
                context=self._get_context(all_lines, line_index),
            )

        # ESLint errors
        match = self.PATTERNS["eslint"].search(line)
        if match:
            return VercelBuildError(
                error_type="eslint",
                message=match.group("message").strip(),
                file_path=match.group("file"),
                line_number=int(match.group("line")),
                column=int(match.group("col")),
                context=self._get_context(all_lines, line_index),
            )

        # Module not found
        match = self.PATTERNS["module_not_found"].search(line)
        if match:
            return VercelBuildError(
                error_type="dependency",
                message=f"Cannot find module '{match.group('module')}'",
                file_path=match.group("file") if match.group("file") else None,
                context=self._get_context(all_lines, line_index),
            )

        # Package manager errors
        match = self.PATTERNS["package_manager"].search(line)
        if match:
            return VercelBuildError(
                error_type="dependency",
                message=match.group("message").strip(),
                context=self._get_context(all_lines, line_index),
            )

        # Next.js build errors
        match = self.PATTERNS["nextjs"].search(line)
        if match:
            return VercelBuildError(
                error_type="build",
                message=match.group("message").strip(),
                context=self._get_context(all_lines, line_index),
            )

        # Generic file errors (last resort)
        if "error" in line.lower():
            match = self.PATTERNS["generic_file_error"].search(line)
            if match:
                return VercelBuildError(
                    error_type="unknown",
                    message=match.group("message").strip(),
                    file_path=match.group("file"),
                    line_number=int(match.group("line")),
                    column=int(match.group("col")) if match.group("col") else None,
                    context=self._get_context(all_lines, line_index),
                )

        return None

    def _get_context(
        self, lines: list[str], index: int, context_lines: int = 2
    ) -> str:
        """Get surrounding context lines for an error."""
        start = max(0, index - context_lines)
        end = min(len(lines), index + context_lines + 1)
        return "\n".join(lines[start:end])

    def _deduplicate_errors(self) -> list[VercelBuildError]:
        """Remove duplicate errors based on file path and message."""
        seen = set()
        unique = []

        for error in self.errors:
            key = (error.file_path, error.line_number, error.message[:50])
            if key not in seen:
                seen.add(key)
                unique.append(error)

        return unique


def format_errors_for_fixer(errors: list[VercelBuildError]) -> str:
    """
    Format errors into markdown for VERCEL_FIX_REQUEST.md.

    Args:
        errors: List of parsed build errors

    Returns:
        Markdown-formatted error report
    """
    if not errors:
        return "No specific errors extracted from build logs."

    lines = [
        "# Vercel Build Errors",
        "",
        f"Found {len(errors)} error(s) that need to be fixed:",
        "",
    ]

    # Group by error type
    by_type: dict[str, list[VercelBuildError]] = {}
    for error in errors:
        by_type.setdefault(error.error_type, []).append(error)

    for error_type, type_errors in by_type.items():
        lines.append(f"## {error_type.title()} Errors ({len(type_errors)})")
        lines.append("")

        for i, error in enumerate(type_errors, 1):
            lines.append(f"### Error {i}")

            if error.file_path:
                location = f"`{error.file_path}`"
                if error.line_number:
                    location += f":{error.line_number}"
                    if error.column:
                        location += f":{error.column}"
                lines.append(f"**Location:** {location}")

            lines.append(f"**Message:** {error.message}")

            if error.context:
                lines.append("")
                lines.append("**Context:**")
                lines.append("```")
                lines.append(error.context)
                lines.append("```")

            lines.append("")

    return "\n".join(lines)
