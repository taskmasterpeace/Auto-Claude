"""
Business Analyzer - Understands current SaaS business model

Analyzes:
- Revenue model (Stripe integration)
- Current performance (conversion, churn)
- Pricing tiers
- Metrics (MRR, LTV, CAC)
"""

import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json


@dataclass
class RevenueModel:
    """Current revenue model structure"""
    type: str  # subscription | usage-based | one-time | freemium
    stripe_connected: bool
    current_mrr: float
    active_subscriptions: int
    pricing_tiers: List[Dict[str, Any]]


@dataclass
class PerformanceMetrics:
    """Current business performance metrics"""
    conversion_rate: float  # Percentage
    churn_rate: float  # Monthly percentage
    avg_ltv: float  # Average customer lifetime value
    avg_cac: float  # Average customer acquisition cost
    ltv_cac_ratio: float  # LTV/CAC ratio (healthy > 3.0)


@dataclass
class BusinessAnalysis:
    """Complete business analysis result"""
    revenue_model: RevenueModel
    performance: PerformanceMetrics
    analyzed_at: str
    recommendations: List[str]


class BusinessAnalyzer:
    """
    Analyzes current SaaS business to understand revenue model and performance.

    Integrates with:
    - Stripe API for revenue data
    - Database for user metrics
    - Analytics for conversion tracking
    """

    def __init__(self, stripe_key: Optional[str] = None, project_dir: str = "."):
        """
        Initialize Business Analyzer

        Args:
            stripe_key: Stripe API key (optional, will use env var)
            project_dir: Project directory for config discovery
        """
        self.stripe_key = stripe_key or os.getenv("STRIPE_API_KEY")
        self.project_dir = project_dir
        self._stripe = None

    @property
    def stripe(self):
        """Lazy-load Stripe library"""
        if self._stripe is None:
            try:
                import stripe
                self._stripe = stripe
                if self.stripe_key:
                    stripe.api_key = self.stripe_key
            except ImportError:
                print("Warning: stripe library not installed. Run: pip install stripe")
                return None
        return self._stripe

    def analyze(self) -> BusinessAnalysis:
        """
        Perform complete business analysis

        Returns:
            BusinessAnalysis with revenue model and performance metrics
        """
        revenue_model = self.analyze_revenue_model()
        performance = self.analyze_performance()
        recommendations = self._generate_recommendations(revenue_model, performance)

        return BusinessAnalysis(
            revenue_model=revenue_model,
            performance=performance,
            analyzed_at=datetime.now().isoformat(),
            recommendations=recommendations
        )

    def analyze_revenue_model(self) -> RevenueModel:
        """
        Analyze revenue model from Stripe

        Returns:
            RevenueModel with current pricing and MRR
        """
        if not self.stripe or not self.stripe_key:
            return self._fallback_revenue_model()

        try:
            # Fetch products and prices
            products = self.stripe.Product.list(limit=100, active=True)
            prices = self.stripe.Price.list(limit=100, active=True)

            # Fetch active subscriptions
            subscriptions = self.stripe.Subscription.list(
                status="active",
                limit=1000,
                expand=["data.items.data.price"]
            )

            # Calculate MRR
            mrr = self._calculate_mrr(subscriptions)

            # Extract pricing tiers
            pricing_tiers = self._extract_pricing_tiers(products, prices)

            # Determine revenue model type
            model_type = self._determine_model_type(pricing_tiers, subscriptions)

            return RevenueModel(
                type=model_type,
                stripe_connected=True,
                current_mrr=mrr,
                active_subscriptions=len(subscriptions.data),
                pricing_tiers=pricing_tiers
            )
        except Exception as e:
            print(f"Error analyzing Stripe data: {e}")
            return self._fallback_revenue_model()

    def analyze_performance(self) -> PerformanceMetrics:
        """
        Analyze business performance metrics

        Returns:
            PerformanceMetrics with conversion, churn, LTV, CAC
        """
        # Try to get metrics from database/analytics
        # For now, return fallback values
        return self._fallback_performance_metrics()

    def _calculate_mrr(self, subscriptions) -> float:
        """Calculate Monthly Recurring Revenue from subscriptions"""
        mrr = 0.0

        for sub in subscriptions.data:
            for item in sub.get("items", {}).get("data", []):
                price = item.get("price", {})
                amount = price.get("unit_amount", 0) / 100  # Convert cents to dollars
                quantity = item.get("quantity", 1)
                interval = price.get("recurring", {}).get("interval", "month")

                # Normalize to monthly
                if interval == "year":
                    amount = amount / 12
                elif interval == "day":
                    amount = amount * 30

                mrr += amount * quantity

        return round(mrr, 2)

    def _extract_pricing_tiers(self, products, prices) -> List[Dict[str, Any]]:
        """Extract pricing tiers from Stripe products and prices"""
        tiers = []

        # Group prices by product
        price_by_product = {}
        for price in prices.data:
            product_id = price.get("product")
            if product_id not in price_by_product:
                price_by_product[product_id] = []
            price_by_product[product_id].append(price)

        # Build tier structure
        for product in products.data:
            product_prices = price_by_product.get(product.id, [])
            if not product_prices:
                continue

            for price in product_prices:
                tier = {
                    "name": product.get("name", "Unknown"),
                    "price": price.get("unit_amount", 0) / 100,
                    "interval": price.get("recurring", {}).get("interval", "month"),
                    "currency": price.get("currency", "usd"),
                    "features": product.get("metadata", {}).get("features", "").split(",") if product.get("metadata", {}).get("features") else []
                }
                tiers.append(tier)

        return tiers

    def _determine_model_type(self, tiers: List[Dict], subscriptions) -> str:
        """Determine revenue model type from pricing structure"""
        if not tiers:
            return "unknown"

        has_free = any(t["price"] == 0 for t in tiers)
        has_subscription = any(t.get("interval") in ["month", "year"] for t in tiers)
        has_usage = any("usage" in str(t.get("features", [])).lower() for t in tiers)

        if has_free and has_subscription:
            return "freemium"
        elif has_usage:
            return "usage-based"
        elif has_subscription:
            return "subscription"
        else:
            return "one-time"

    def _generate_recommendations(self, revenue_model: RevenueModel, performance: PerformanceMetrics) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []

        # MRR recommendations
        if revenue_model.current_mrr < 1000:
            recommendations.append("Focus on acquiring first 10 paying customers before adding features")
        elif revenue_model.current_mrr < 10000:
            recommendations.append("Optimize conversion funnel - biggest revenue impact at this stage")

        # LTV/CAC ratio recommendations
        if performance.ltv_cac_ratio < 3.0:
            recommendations.append(f"LTV/CAC ratio is {performance.ltv_cac_ratio:.1f} (target: >3.0). Focus on retention or reduce CAC")

        # Churn recommendations
        if performance.churn_rate > 5.0:
            recommendations.append(f"High churn rate ({performance.churn_rate:.1f}%). Investigate user experience and onboarding")

        # Pricing tier recommendations
        if len(revenue_model.pricing_tiers) < 3:
            recommendations.append("Consider adding more pricing tiers to capture different customer segments")

        return recommendations

    def _fallback_revenue_model(self) -> RevenueModel:
        """Fallback revenue model when Stripe is not connected"""
        return RevenueModel(
            type="unknown",
            stripe_connected=False,
            current_mrr=0.0,
            active_subscriptions=0,
            pricing_tiers=[]
        )

    def _fallback_performance_metrics(self) -> PerformanceMetrics:
        """Fallback performance metrics when data is unavailable"""
        return PerformanceMetrics(
            conversion_rate=0.0,
            churn_rate=0.0,
            avg_ltv=0.0,
            avg_cac=0.0,
            ltv_cac_ratio=0.0
        )

    def to_dict(self, analysis: BusinessAnalysis) -> Dict:
        """Convert analysis to dictionary"""
        return {
            "revenue_model": asdict(analysis.revenue_model),
            "performance": asdict(analysis.performance),
            "analyzed_at": analysis.analyzed_at,
            "recommendations": analysis.recommendations
        }

    def save_analysis(self, analysis: BusinessAnalysis, output_file: str):
        """Save analysis to JSON file"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(analysis), f, indent=2)
        print(f"Business analysis saved to {output_file}")


def main():
    """CLI entry point for business analysis"""
    import argparse

    parser = argparse.ArgumentParser(description="Analyze SaaS business model and performance")
    parser.add_argument("--stripe-key", help="Stripe API key (or set STRIPE_API_KEY env var)")
    parser.add_argument("--output", default="business_analysis.json", help="Output file path")
    parser.add_argument("--project-dir", default=".", help="Project directory")

    args = parser.parse_args()

    analyzer = BusinessAnalyzer(
        stripe_key=args.stripe_key,
        project_dir=args.project_dir
    )

    print("Analyzing business model...")
    analysis = analyzer.analyze()

    print("\n=== Business Analysis ===")
    print(f"Revenue Model: {analysis.revenue_model.type}")
    print(f"Stripe Connected: {analysis.revenue_model.stripe_connected}")
    print(f"Current MRR: ${analysis.revenue_model.current_mrr:,.2f}")
    print(f"Active Subscriptions: {analysis.revenue_model.active_subscriptions}")
    print(f"\nPricing Tiers: {len(analysis.revenue_model.pricing_tiers)}")

    print(f"\n=== Performance Metrics ===")
    print(f"Conversion Rate: {analysis.performance.conversion_rate:.1f}%")
    print(f"Churn Rate: {analysis.performance.churn_rate:.1f}%")
    print(f"Avg LTV: ${analysis.performance.avg_ltv:,.2f}")
    print(f"Avg CAC: ${analysis.performance.avg_cac:,.2f}")
    print(f"LTV/CAC Ratio: {analysis.performance.ltv_cac_ratio:.1f}")

    if analysis.recommendations:
        print(f"\n=== Recommendations ===")
        for i, rec in enumerate(analysis.recommendations, 1):
            print(f"{i}. {rec}")

    analyzer.save_analysis(analysis, args.output)


if __name__ == "__main__":
    main()
