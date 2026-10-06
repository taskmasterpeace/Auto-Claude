"""
BMAD Utilities for Revenue-Aware Builds

Provides automatic detection and context injection for revenue-first specs.
"""

import json
from pathlib import Path
from typing import Dict, Optional


def is_bmad_spec(spec_dir: Path) -> bool:
    """
    Check if a spec directory contains revenue tracking (BMAD spec).

    Args:
        spec_dir: Path to spec directory

    Returns:
        True if this is a BMAD spec with revenue tracking
    """
    if not spec_dir.exists():
        return False

    revenue_tracking_file = spec_dir / "revenue_tracking.json"
    return revenue_tracking_file.exists()


def load_bmad_context(spec_dir: Path) -> Optional[Dict]:
    """
    Load BMAD revenue context from spec directory.

    Args:
        spec_dir: Path to spec directory

    Returns:
        Dictionary with revenue tracking data, or None if not a BMAD spec
    """
    if not is_bmad_spec(spec_dir):
        return None

    revenue_file = spec_dir / "revenue_tracking.json"
    try:
        with open(revenue_file) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def get_revenue_context_for_agent(spec_dir: Path) -> str:
    """
    Generate revenue context text for agent prompts.

    Args:
        spec_dir: Path to spec directory

    Returns:
        Formatted revenue context string, or empty string if not BMAD spec
    """
    bmad_context = load_bmad_context(spec_dir)
    if not bmad_context:
        return ""

    # Extract key metrics
    predicted_revenue = bmad_context.get("predicted_revenue_monthly", 0)
    roi_score = bmad_context.get("roi_score", 0)
    effort_days = bmad_context.get("implementation_effort_days", 0)
    competitors_charging = bmad_context.get("competitors_charging", 0)
    avg_price = bmad_context.get("avg_competitor_price", 0)

    # Get milestones
    milestones = bmad_context.get("revenue_milestones", {})
    day_7_target = milestones.get("7_day", {}).get("target_revenue", 0)
    day_30_target = milestones.get("30_day", {}).get("target_revenue", 0)

    context = f"""
## 💰 REVENUE-FIRST BUILD (BMAD)

This is a revenue-generating feature with specific business targets:

**Revenue Targets:**
- Predicted Revenue: ${predicted_revenue:,.2f}/month
- ROI Score: ${roi_score:,.2f} per day
- Implementation Effort: {effort_days:.1f} days
- Competitor Validation: {competitors_charging} competitors charge ${avg_price:.2f} avg

**Revenue Milestones:**
- 7-day target: ${day_7_target:,.2f}
- 30-day target: ${day_30_target:,.2f}

**Your Goals:**
1. **Build for Revenue**: Every decision should optimize for revenue generation
2. **Add Telemetry**: Include tracking to measure actual revenue vs predicted
3. **Match Competitors**: Feature must match competitor offerings to justify pricing
4. **Launch Fast**: Speed to revenue is critical - use libraries when possible

**Success Criteria:**
- Feature ships and generates measurable revenue
- Telemetry shows user adoption and conversion
- Revenue tracking validates predictions
"""
    return context.strip()


def get_revenue_validation_requirements(spec_dir: Path) -> Optional[Dict]:
    """
    Get revenue-specific validation requirements for QA.

    Args:
        spec_dir: Path to spec directory

    Returns:
        Dictionary with validation requirements, or None if not BMAD spec
    """
    bmad_context = load_bmad_context(spec_dir)
    if not bmad_context:
        return None

    return {
        "telemetry_required": True,
        "revenue_tracking": {
            "predicted_monthly": bmad_context.get("predicted_revenue_monthly", 0),
            "roi_score": bmad_context.get("roi_score", 0),
            "milestones": bmad_context.get("revenue_milestones", {})
        },
        "validation_checks": [
            "Feature tracking/analytics is implemented",
            "User conversion funnel is measurable",
            "Revenue attribution is possible",
            "Feature matches competitor offerings",
            "Pricing/paywall is properly integrated"
        ]
    }


def update_revenue_milestone(
    spec_dir: Path,
    milestone_key: str,
    actual_revenue: float,
    notes: str = ""
) -> bool:
    """
    Update actual revenue for a milestone.

    Args:
        spec_dir: Path to spec directory
        milestone_key: Milestone key (e.g., "7_day", "30_day")
        actual_revenue: Actual revenue achieved
        notes: Optional notes about the milestone

    Returns:
        True if update was successful
    """
    if not is_bmad_spec(spec_dir):
        return False

    revenue_file = spec_dir / "revenue_tracking.json"
    try:
        with open(revenue_file) as f:
            data = json.load(f)

        if milestone_key not in data.get("revenue_milestones", {}):
            return False

        data["revenue_milestones"][milestone_key]["actual_revenue"] = actual_revenue
        data["revenue_milestones"][milestone_key]["achieved"] = actual_revenue > 0
        if notes:
            data["revenue_milestones"][milestone_key]["notes"] = notes

        with open(revenue_file, "w") as f:
            json.dump(data, f, indent=2)

        return True
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        return False


def get_revenue_status(spec_dir: Path) -> Optional[Dict]:
    """
    Get current revenue status for a BMAD spec.

    Args:
        spec_dir: Path to spec directory

    Returns:
        Dictionary with revenue status, or None if not BMAD spec
    """
    bmad_context = load_bmad_context(spec_dir)
    if not bmad_context:
        return None

    predicted = bmad_context.get("predicted_revenue_monthly", 0)
    milestones = bmad_context.get("revenue_milestones", {})

    # Calculate progress
    milestone_progress = []
    for key, milestone in milestones.items():
        target = milestone.get("target_revenue", 0)
        actual = milestone.get("actual_revenue", 0)
        achieved = milestone.get("achieved", False)

        progress_pct = (actual / target * 100) if target > 0 else 0

        milestone_progress.append({
            "period": key,
            "target": target,
            "actual": actual,
            "achieved": achieved,
            "progress_pct": progress_pct
        })

    return {
        "predicted_monthly": predicted,
        "roi_score": bmad_context.get("roi_score", 0),
        "implementation_effort_days": bmad_context.get("implementation_effort_days", 0),
        "milestones": milestone_progress,
        "feature": bmad_context.get("feature", "Unknown"),
        "status": bmad_context.get("status", "planning")
    }
