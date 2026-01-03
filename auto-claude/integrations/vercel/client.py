"""
Vercel REST API Client
======================

HTTP client for interacting with Vercel's REST API.
Handles deployment status checks and build log retrieval.

API Reference: https://vercel.com/docs/rest-api
"""

import asyncio
from typing import Optional

import httpx

from .config import (
    DEFAULT_POLL_INTERVAL_SECONDS,
    DEFAULT_POLL_TIMEOUT_MINUTES,
    STATUS_BUILDING,
    STATUS_ERROR,
    STATUS_QUEUED,
    STATUS_READY,
    VercelConfig,
    VercelDeploymentState,
)


class VercelAPIError(Exception):
    """Error from Vercel API."""

    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.status_code = status_code


class VercelClient:
    """
    Client for Vercel REST API.

    Provides methods to:
    - List deployments for a project
    - Get deployment status
    - Fetch build logs/events
    - Find deployment by commit SHA
    """

    BASE_URL = "https://api.vercel.com"

    def __init__(self, config: VercelConfig):
        self.config = config
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        headers = {
            "Authorization": f"Bearer {self.config.token}",
            "Content-Type": "application/json",
        }
        self._client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers=headers,
            timeout=30.0,
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()
            self._client = None

    def _add_team_param(self, params: dict) -> dict:
        """Add team ID to params if configured."""
        if self.config.team_id:
            params["teamId"] = self.config.team_id
        return params

    async def list_deployments(
        self,
        limit: int = 10,
        state: Optional[str] = None,
    ) -> list[dict]:
        """
        List recent deployments for the project.

        Args:
            limit: Maximum number of deployments to return
            state: Filter by state (BUILDING, READY, ERROR, etc.)

        Returns:
            List of deployment objects
        """
        params = self._add_team_param(
            {
                "projectId": self.config.project_id,
                "limit": limit,
            }
        )
        if state:
            params["state"] = state

        response = await self._client.get("/v6/deployments", params=params)

        if response.status_code != 200:
            raise VercelAPIError(
                f"Failed to list deployments: {response.text}",
                response.status_code,
            )

        data = response.json()
        return data.get("deployments", [])

    async def get_deployment(self, deployment_id: str) -> dict:
        """
        Get deployment details by ID.

        Args:
            deployment_id: The deployment ID (dpl_xxx)

        Returns:
            Deployment object with status, URL, etc.
        """
        params = self._add_team_param({})

        response = await self._client.get(
            f"/v13/deployments/{deployment_id}",
            params=params if params else None,
        )

        if response.status_code != 200:
            raise VercelAPIError(
                f"Failed to get deployment: {response.text}",
                response.status_code,
            )

        return response.json()

    async def get_deployment_events(self, deployment_id: str) -> list[dict]:
        """
        Get build events/logs for a deployment.

        These contain the actual build output including errors.

        Args:
            deployment_id: The deployment ID

        Returns:
            List of build event objects
        """
        params = self._add_team_param({})

        response = await self._client.get(
            f"/v2/deployments/{deployment_id}/events",
            params=params if params else None,
        )

        if response.status_code != 200:
            raise VercelAPIError(
                f"Failed to get deployment events: {response.text}",
                response.status_code,
            )

        return response.json()

    async def find_deployment_by_commit(
        self,
        commit_sha: str,
        wait_seconds: int = 30,
    ) -> Optional[dict]:
        """
        Find a deployment matching a specific commit SHA.

        Args:
            commit_sha: Git commit SHA to match
            wait_seconds: How long to wait for deployment to appear

        Returns:
            Deployment object if found, None otherwise
        """
        start_time = asyncio.get_event_loop().time()

        while (asyncio.get_event_loop().time() - start_time) < wait_seconds:
            deployments = await self.list_deployments(limit=10)

            for deployment in deployments:
                # Check meta.gitCommitSha for the commit
                meta = deployment.get("meta", {})
                deploy_sha = meta.get("gitCommitSha", "")

                # Match full SHA or prefix
                if deploy_sha and (
                    deploy_sha == commit_sha or deploy_sha.startswith(commit_sha[:7])
                ):
                    return deployment

            # Wait before retrying
            await asyncio.sleep(5)

        return None

    async def wait_for_deployment(
        self,
        commit_sha: str,
        poll_interval: int = DEFAULT_POLL_INTERVAL_SECONDS,
        timeout_minutes: int = DEFAULT_POLL_TIMEOUT_MINUTES,
    ) -> VercelDeploymentState:
        """
        Wait for a deployment to complete (success or failure).

        This is the main entry point for monitoring deployments.

        Args:
            commit_sha: Git commit SHA to monitor
            poll_interval: Seconds between status checks
            timeout_minutes: Maximum time to wait

        Returns:
            VercelDeploymentState with final status and any errors
        """
        from datetime import datetime

        timeout_seconds = timeout_minutes * 60
        start_time = asyncio.get_event_loop().time()

        print(f"\nWaiting for Vercel deployment for commit {commit_sha[:7]}...")

        # First, find the deployment
        deployment = await self.find_deployment_by_commit(
            commit_sha, wait_seconds=60
        )

        if not deployment:
            return VercelDeploymentState(
                commit_sha=commit_sha,
                status=STATUS_ERROR,
                error_message=f"No deployment found for commit {commit_sha[:7]} after 60s",
                created_at=datetime.now().isoformat(),
            )

        deployment_id = deployment.get("uid")
        print(f"Found deployment: {deployment_id}")

        # Create initial state
        state = VercelDeploymentState(
            deployment_id=deployment_id,
            commit_sha=commit_sha,
            status=deployment.get("state", STATUS_QUEUED),
            url=deployment.get("url"),
            created_at=datetime.now().isoformat(),
        )

        # Poll until complete or timeout
        while (asyncio.get_event_loop().time() - start_time) < timeout_seconds:
            # Get latest status
            try:
                deployment = await self.get_deployment(deployment_id)
            except VercelAPIError as e:
                print(f"Warning: Failed to get deployment status: {e}")
                await asyncio.sleep(poll_interval)
                continue

            current_status = deployment.get("state", "").upper()
            state.status = current_status
            state.url = deployment.get("url")

            # Check for completion states
            if current_status == STATUS_READY:
                print(f"Deployment succeeded: https://{state.url}")
                return state

            if current_status == STATUS_ERROR:
                # Get build logs to extract errors
                state.error_message = deployment.get("errorMessage", "Build failed")

                try:
                    events = await self.get_deployment_events(deployment_id)
                    state.errors = self._extract_errors_from_events(events)
                except VercelAPIError:
                    pass  # Continue without detailed errors

                print(f"Deployment failed: {state.error_message}")
                return state

            if current_status == "CANCELED":
                state.status = "CANCELED"
                state.error_message = "Deployment was canceled"
                return state

            # Still building
            print(f"  Status: {current_status}...")
            await asyncio.sleep(poll_interval)

        # Timeout reached
        state.error_message = f"Deployment timed out after {timeout_minutes} minutes"
        return state

    def _extract_errors_from_events(self, events: list[dict]) -> list[dict]:
        """
        Extract error information from build events.

        This is a simple extraction - the parser module does more sophisticated
        error parsing.

        Args:
            events: List of build event objects

        Returns:
            List of error dicts with basic info
        """
        errors = []

        for event in events:
            # Look for error type events
            event_type = event.get("type", "")
            payload = event.get("payload", {})

            if event_type == "error" or payload.get("error"):
                error_text = payload.get("text", "") or payload.get("error", "")
                if error_text:
                    errors.append(
                        {
                            "error_type": "build",
                            "message": error_text[:500],
                            "context": str(payload)[:200],
                        }
                    )

            # Also look for specific error patterns in stdout
            if event_type == "stdout":
                text = payload.get("text", "")
                # Common error indicators
                if any(
                    indicator in text.lower()
                    for indicator in [
                        "error:",
                        "error[",
                        "failed to",
                        "cannot find",
                        "type error",
                        "syntaxerror",
                    ]
                ):
                    errors.append(
                        {
                            "error_type": "build",
                            "message": text[:500],
                        }
                    )

        return errors
