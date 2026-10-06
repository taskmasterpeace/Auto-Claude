"""
Opportunity Finder - Finds revenue opportunities from competitors

Analyzes:
- Competitor pricing pages
- Features they charge for that you don't have
- GitHub libraries for implementation (don't rebuild)
- ROI calculation (revenue potential / effort)
"""

import os
import re
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import requests
from bs4 import BeautifulSoup


@dataclass
class CompetitorPricing:
    """Competitor pricing structure"""
    company: str
    url: str
    tiers: List[Dict]
    features_by_tier: Dict[str, List[str]]
    avg_price: float


@dataclass
class RevenueOpportunity:
    """A single revenue opportunity"""
    feature: str
    description: str
    competitors_charging: List[str]
    avg_competitor_price: float
    potential_revenue_monthly: float
    implementation_effort_days: float
    roi_score: float  # revenue / effort
    github_libraries: List[Dict[str, str]]
    build_vs_buy_recommendation: str


@dataclass
class OpportunityReport:
    """Complete opportunity analysis report"""
    analyzed_at: str
    your_current_mrr: float
    opportunities: List[RevenueOpportunity]
    total_potential_revenue: float
    top_3_recommendations: List[str]


class OpportunityFinder:
    """
    Finds revenue opportunities by analyzing competitors

    Process:
    1. Scrape competitor pricing pages
    2. Extract features they charge for
    3. Find features you don't have
    4. Calculate potential revenue
    5. Research GitHub libraries (don't rebuild)
    6. Calculate ROI (revenue / effort)
    """

    def __init__(self, competitor_urls: List[str], your_features: List[str], current_mrr: float):
        """
        Initialize Opportunity Finder

        Args:
            competitor_urls: List of competitor pricing page URLs
            your_features: List of features you currently have
            current_mrr: Your current monthly recurring revenue
        """
        self.competitor_urls = competitor_urls
        self.your_features = set(f.lower() for f in your_features)
        self.current_mrr = current_mrr
        self.github_token = os.getenv("GITHUB_TOKEN")

    def find_opportunities(self) -> OpportunityReport:
        """
        Find all revenue opportunities

        Returns:
            OpportunityReport with ranked opportunities
        """
        # Step 1: Scrape competitor pricing
        print("Scraping competitor pricing pages...")
        competitors = [self._scrape_competitor(url) for url in self.competitor_urls]
        competitors = [c for c in competitors if c is not None]

        if not competitors:
            print("Warning: No competitor data could be scraped")
            return self._empty_report()

        # Step 2: Find feature gaps
        print("Analyzing feature gaps...")
        feature_gaps = self._find_feature_gaps(competitors)

        # Step 3: Calculate revenue opportunities
        print("Calculating revenue opportunities...")
        opportunities = []
        for feature, data in feature_gaps.items():
            opportunity = self._calculate_opportunity(feature, data, competitors)
            if opportunity:
                opportunities.append(opportunity)

        # Step 4: Rank by ROI
        opportunities.sort(key=lambda x: x.roi_score, reverse=True)

        # Step 5: Generate recommendations
        top_3 = self._generate_top_recommendations(opportunities)

        total_potential = sum(o.potential_revenue_monthly for o in opportunities)

        return OpportunityReport(
            analyzed_at=datetime.now().isoformat(),
            your_current_mrr=self.current_mrr,
            opportunities=opportunities,
            total_potential_revenue=total_potential,
            top_3_recommendations=top_3
        )

    def _scrape_competitor(self, url: str) -> Optional[CompetitorPricing]:
        """Scrape competitor pricing page"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract company name from domain
            company = url.split("//")[1].split("/")[0].replace("www.", "")

            # Extract pricing tiers and features
            tiers, features_by_tier = self._extract_pricing_structure(soup)

            if not tiers:
                print(f"Warning: Could not extract pricing from {url}")
                return None

            avg_price = sum(t.get("price", 0) for t in tiers) / len(tiers) if tiers else 0

            return CompetitorPricing(
                company=company,
                url=url,
                tiers=tiers,
                features_by_tier=features_by_tier,
                avg_price=avg_price
            )
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return None

    def _extract_pricing_structure(self, soup: BeautifulSoup) -> Tuple[List[Dict], Dict[str, List[str]]]:
        """Extract pricing tiers and features from HTML"""
        tiers = []
        features_by_tier = {}

        # Common patterns for pricing pages
        price_patterns = [
            r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|dollars?)',
        ]

        # Find pricing cards/sections
        pricing_sections = soup.find_all(['div', 'section'], class_=re.compile(r'pric|plan|tier', re.I))

        for section in pricing_sections:
            # Extract tier name
            tier_name_elem = section.find(['h2', 'h3', 'h4'])
            tier_name = tier_name_elem.get_text(strip=True) if tier_name_elem else "Unknown"

            # Extract price
            price = 0.0
            price_text = section.get_text()
            for pattern in price_patterns:
                match = re.search(pattern, price_text)
                if match:
                    price_str = match.group(1).replace(',', '')
                    price = float(price_str)
                    break

            # Extract features (typically in ul/li)
            features = []
            feature_lists = section.find_all(['ul', 'ol'])
            for ul in feature_lists:
                for li in ul.find_all('li'):
                    feature_text = li.get_text(strip=True)
                    if feature_text and len(feature_text) < 200:  # Reasonable feature length
                        features.append(feature_text)

            if tier_name and (price > 0 or features):
                tiers.append({
                    "name": tier_name,
                    "price": price,
                    "features": features
                })
                features_by_tier[tier_name] = features

        return tiers, features_by_tier

    def _find_feature_gaps(self, competitors: List[CompetitorPricing]) -> Dict[str, Dict]:
        """Find features competitors have that you don't"""
        feature_gaps = {}

        for competitor in competitors:
            for tier_name, features in competitor.features_by_tier.items():
                tier_price = next((t["price"] for t in competitor.tiers if t["name"] == tier_name), 0)

                for feature in features:
                    feature_normalized = self._normalize_feature(feature)

                    # Skip if we already have this feature
                    if self._has_feature(feature_normalized):
                        continue

                    # Track which competitors charge for this
                    if feature_normalized not in feature_gaps:
                        feature_gaps[feature_normalized] = {
                            "original_text": feature,
                            "competitors": [],
                            "prices": []
                        }

                    feature_gaps[feature_normalized]["competitors"].append(competitor.company)
                    feature_gaps[feature_normalized]["prices"].append(tier_price)

        # Filter to features that 2+ competitors charge for
        return {k: v for k, v in feature_gaps.items() if len(v["competitors"]) >= 2}

    def _normalize_feature(self, feature: str) -> str:
        """Normalize feature name for comparison"""
        # Remove common prefixes/suffixes
        feature = re.sub(r'(unlimited|advanced|basic|premium|pro)', '', feature, flags=re.I)
        # Remove special characters
        feature = re.sub(r'[^\w\s]', ' ', feature)
        # Normalize whitespace
        feature = ' '.join(feature.lower().split())
        return feature

    def _has_feature(self, feature_normalized: str) -> bool:
        """Check if we already have this feature"""
        feature_keywords = set(feature_normalized.split())
        for our_feature in self.your_features:
            our_keywords = set(our_feature.split())
            # If 50%+ keywords match, consider it the same feature
            overlap = len(feature_keywords & our_keywords)
            if overlap / len(feature_keywords) >= 0.5:
                return True
        return False

    def _calculate_opportunity(self, feature: str, data: Dict, competitors: List[CompetitorPricing]) -> Optional[RevenueOpportunity]:
        """Calculate revenue opportunity for a feature"""
        # Average price competitors charge
        avg_price = sum(data["prices"]) / len(data["prices"]) if data["prices"] else 0

        if avg_price == 0:
            return None

        # Estimate potential revenue (conservative: 20% of current subscribers would upgrade)
        estimated_adopters = max(1, int(self.current_mrr / 50 * 0.2))  # Assume $50 avg per user, 20% adoption
        potential_revenue = estimated_adopters * avg_price

        # Estimate implementation effort (will be refined by AI later)
        effort_days = self._estimate_effort(feature)

        # Search GitHub for existing libraries
        github_libs = self._search_github_libraries(feature)

        # Build vs buy recommendation
        build_vs_buy = self._build_vs_buy_analysis(feature, effort_days, github_libs)

        # Calculate ROI score
        roi_score = potential_revenue / max(effort_days, 0.5)  # Prevent division by zero

        return RevenueOpportunity(
            feature=feature,
            description=data["original_text"],
            competitors_charging=data["competitors"],
            avg_competitor_price=avg_price,
            potential_revenue_monthly=potential_revenue,
            implementation_effort_days=effort_days,
            roi_score=roi_score,
            github_libraries=github_libs,
            build_vs_buy_recommendation=build_vs_buy
        )

    def _estimate_effort(self, feature: str) -> float:
        """Estimate implementation effort in days"""
        # Simple heuristic based on feature keywords
        # This will be improved with AI estimation later
        complex_keywords = ['integration', 'api', 'authentication', 'payment', 'security', 'analytics']
        medium_keywords = ['dashboard', 'report', 'export', 'import', 'notification', 'search']

        feature_lower = feature.lower()

        if any(kw in feature_lower for kw in complex_keywords):
            return 5.0
        elif any(kw in feature_lower for kw in medium_keywords):
            return 2.0
        else:
            return 1.0

    def _search_github_libraries(self, feature: str) -> List[Dict[str, str]]:
        """Search GitHub for existing libraries"""
        if not self.github_token:
            return []

        try:
            headers = {
                'Authorization': f'token {self.github_token}',
                'Accept': 'application/vnd.github.v3+json'
            }

            # Search for libraries with 1000+ stars
            query = f"{feature} stars:>1000"
            url = f"https://api.github.com/search/repositories?q={query}&sort=stars&per_page=5"

            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            results = response.json()
            libraries = []

            for repo in results.get("items", [])[:5]:
                libraries.append({
                    "name": repo["full_name"],
                    "stars": repo["stargazers_count"],
                    "description": repo["description"] or "",
                    "url": repo["html_url"]
                })

            return libraries
        except Exception as e:
            print(f"Error searching GitHub for {feature}: {e}")
            return []

    def _build_vs_buy_analysis(self, feature: str, effort_days: float, libraries: List[Dict]) -> str:
        """Determine build vs buy recommendation"""
        if not libraries:
            return f"BUILD - No existing libraries found. Estimated effort: {effort_days} days"

        # If there are high-quality libraries (>5k stars), recommend using them
        high_quality = [lib for lib in libraries if lib["stars"] > 5000]
        if high_quality:
            lib = high_quality[0]
            return f"USE LIBRARY - {lib['name']} ({lib['stars']:,} stars) instead of building from scratch"

        # If libraries exist but lower quality, still recommend using
        if libraries:
            lib = libraries[0]
            return f"CONSIDER LIBRARY - {lib['name']} ({lib['stars']:,} stars) to reduce {effort_days} day effort"

        return f"BUILD - Estimated effort: {effort_days} days"

    def _generate_top_recommendations(self, opportunities: List[RevenueOpportunity]) -> List[str]:
        """Generate top 3 recommendations based on ROI"""
        recommendations = []

        for i, opp in enumerate(opportunities[:3], 1):
            rec = (
                f"#{i} {opp.feature.title()}: "
                f"${opp.potential_revenue_monthly:,.0f}/mo potential "
                f"({len(opp.competitors_charging)} competitors charge ${opp.avg_competitor_price:.0f}). "
                f"{opp.build_vs_buy_recommendation}"
            )
            recommendations.append(rec)

        return recommendations

    def _empty_report(self) -> OpportunityReport:
        """Return empty report when no data available"""
        return OpportunityReport(
            analyzed_at=datetime.now().isoformat(),
            your_current_mrr=self.current_mrr,
            opportunities=[],
            total_potential_revenue=0.0,
            top_3_recommendations=[]
        )

    def save_report(self, report: OpportunityReport, output_file: str):
        """Save opportunity report to JSON file"""
        report_dict = {
            "analyzed_at": report.analyzed_at,
            "your_current_mrr": report.your_current_mrr,
            "total_potential_revenue": report.total_potential_revenue,
            "opportunities": [asdict(opp) for opp in report.opportunities],
            "top_3_recommendations": report.top_3_recommendations
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report_dict, f, indent=2)
        print(f"Opportunity report saved to {output_file}")


def main():
    """CLI entry point for opportunity finding"""
    import argparse

    parser = argparse.ArgumentParser(description="Find revenue opportunities from competitors")
    parser.add_argument("--competitors", nargs="+", required=True, help="Competitor pricing page URLs")
    parser.add_argument("--features", nargs="+", default=[], help="Your current features")
    parser.add_argument("--mrr", type=float, default=0.0, help="Your current MRR")
    parser.add_argument("--output", default="opportunities.json", help="Output file path")

    args = parser.parse_args()

    finder = OpportunityFinder(
        competitor_urls=args.competitors,
        your_features=args.features,
        current_mrr=args.mrr
    )

    print("Finding revenue opportunities...")
    report = finder.find_opportunities()

    print(f"\n=== Revenue Opportunities ===")
    print(f"Your Current MRR: ${report.your_current_mrr:,.2f}")
    print(f"Total Potential: +${report.total_potential_revenue:,.2f}/mo")
    print(f"Found {len(report.opportunities)} opportunities")

    if report.top_3_recommendations:
        print(f"\n=== Top 3 Recommendations ===")
        for rec in report.top_3_recommendations:
            print(f"  {rec}")

    finder.save_report(report, args.output)


if __name__ == "__main__":
    main()
