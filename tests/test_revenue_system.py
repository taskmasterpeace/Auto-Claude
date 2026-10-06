"""
Tests for Revenue-First System

Basic smoke tests to ensure the system works.
"""

import pytest
import sys
from pathlib import Path

# Add auto-claude to path
sys.path.insert(0, str(Path(__file__).parent.parent / "auto-claude"))

from revenue.business_analyzer import (
    BusinessAnalyzer,
    RevenueModel,
    PerformanceMetrics
)
from revenue.opportunity_finder import OpportunityFinder


class TestBusinessAnalyzer:
    """Test BusinessAnalyzer functionality"""

    def test_init_without_stripe(self):
        """Test analyzer initializes without Stripe"""
        analyzer = BusinessAnalyzer(stripe_key=None)
        assert analyzer.stripe_key is None

    def test_fallback_revenue_model(self):
        """Test fallback revenue model when Stripe unavailable"""
        analyzer = BusinessAnalyzer(stripe_key=None)
        model = analyzer._fallback_revenue_model()

        assert isinstance(model, RevenueModel)
        assert model.type == "unknown"
        assert model.stripe_connected is False
        assert model.current_mrr == 0.0

    def test_fallback_performance_metrics(self):
        """Test fallback performance metrics"""
        analyzer = BusinessAnalyzer(stripe_key=None)
        metrics = analyzer._fallback_performance_metrics()

        assert isinstance(metrics, PerformanceMetrics)
        assert metrics.conversion_rate == 0.0
        assert metrics.ltv_cac_ratio == 0.0

    def test_analyze_without_stripe(self):
        """Test full analysis without Stripe"""
        analyzer = BusinessAnalyzer(stripe_key=None)
        analysis = analyzer.analyze()

        assert analysis.revenue_model.type == "unknown"
        assert isinstance(analysis.recommendations, list)

    def test_generate_recommendations(self):
        """Test recommendation generation"""
        analyzer = BusinessAnalyzer(stripe_key=None)

        # Low MRR scenario
        revenue_model = RevenueModel(
            type="subscription",
            stripe_connected=False,
            current_mrr=500.0,
            active_subscriptions=10,
            pricing_tiers=[]
        )
        performance = PerformanceMetrics(
            conversion_rate=2.0,
            churn_rate=8.0,
            avg_ltv=1000.0,
            avg_cac=500.0,
            ltv_cac_ratio=2.0
        )

        recommendations = analyzer._generate_recommendations(revenue_model, performance)

        assert len(recommendations) > 0
        assert any("first 10 paying customers" in rec for rec in recommendations)
        assert any("churn" in rec.lower() for rec in recommendations)


class TestOpportunityFinder:
    """Test OpportunityFinder functionality"""

    def test_init(self):
        """Test opportunity finder initialization"""
        finder = OpportunityFinder(
            competitor_urls=["https://example.com/pricing"],
            your_features=["user auth", "api access"],
            current_mrr=5000.0
        )

        assert len(finder.competitor_urls) == 1
        assert len(finder.your_features) == 2
        assert finder.current_mrr == 5000.0

    def test_normalize_feature(self):
        """Test feature normalization"""
        finder = OpportunityFinder(
            competitor_urls=[],
            your_features=[],
            current_mrr=0
        )

        # Test basic normalization
        assert finder._normalize_feature("User Authentication") == "user authentication"
        # "Advanced" is removed as common prefix
        assert finder._normalize_feature("Advanced API Access!!!") == "api access"
        # "Premium" is removed as common prefix
        assert finder._normalize_feature("Premium  Dashboard   ") == "dashboard"

    def test_has_feature(self):
        """Test feature matching"""
        finder = OpportunityFinder(
            competitor_urls=[],
            your_features=["user authentication", "api access"],
            current_mrr=0
        )

        # Should match
        assert finder._has_feature("user authentication")
        assert finder._has_feature("api access control")  # 50% keyword match

        # Should not match
        assert not finder._has_feature("pdf export")

    def test_estimate_effort(self):
        """Test effort estimation"""
        finder = OpportunityFinder(
            competitor_urls=[],
            your_features=[],
            current_mrr=0
        )

        # Complex features (contains keywords: integration, api, authentication, payment, security, analytics)
        assert finder._estimate_effort("stripe payment integration") == 5.0
        assert finder._estimate_effort("oauth authentication") == 5.0
        assert finder._estimate_effort("analytics dashboard") == 5.0  # "analytics" is complex keyword

        # Medium features (contains keywords: dashboard, report, export, import, notification, search)
        assert finder._estimate_effort("user dashboard") == 2.0
        assert finder._estimate_effort("export to pdf") == 2.0

        # Simple features
        assert finder._estimate_effort("dark mode") == 1.0

    def test_empty_report(self):
        """Test empty report generation"""
        finder = OpportunityFinder(
            competitor_urls=[],
            your_features=[],
            current_mrr=1000.0
        )

        report = finder._empty_report()

        assert report.your_current_mrr == 1000.0
        assert len(report.opportunities) == 0
        assert report.total_potential_revenue == 0.0

    def test_build_vs_buy_analysis(self):
        """Test build vs buy decision logic"""
        finder = OpportunityFinder(
            competitor_urls=[],
            your_features=[],
            current_mrr=0
        )

        # No libraries - should recommend BUILD
        result = finder._build_vs_buy_analysis("feature", 3.0, [])
        assert "BUILD" in result

        # High-quality library - should recommend USE LIBRARY
        result = finder._build_vs_buy_analysis("feature", 3.0, [
            {"name": "org/repo", "stars": 10000, "description": "Great lib"}
        ])
        assert "USE LIBRARY" in result

        # Lower-quality library - should recommend CONSIDER
        result = finder._build_vs_buy_analysis("feature", 3.0, [
            {"name": "org/repo", "stars": 2000, "description": "Good lib"}
        ])
        assert "CONSIDER LIBRARY" in result


def test_integration_imports():
    """Test that all modules can be imported"""
    from revenue import BusinessAnalyzer, OpportunityFinder
    from revenue.bmad_integration import RevenueBMADIntegrator

    assert BusinessAnalyzer is not None
    assert OpportunityFinder is not None
    assert RevenueBMADIntegrator is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
