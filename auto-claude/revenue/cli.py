"""
Revenue-First System CLI

Commands:
- analyze-business: Analyze current business model (Stripe, MRR, pricing)
- find-opportunities: Find revenue opportunities from competitors
- weekly-report: Generate weekly revenue report with top opportunities
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from revenue.business_analyzer import BusinessAnalyzer
from revenue.opportunity_finder import OpportunityFinder
from revenue.interactive_bmad import InteractiveBMADBuilder


def analyze_business_command(args):
    """Analyze business model and performance"""
    analyzer = BusinessAnalyzer(
        stripe_key=args.stripe_key,
        project_dir=args.project_dir
    )

    print("🔍 Analyzing business model...")
    analysis = analyzer.analyze()

    print("\n" + "="*60)
    print("💰 BUSINESS ANALYSIS")
    print("="*60)

    print(f"\n📊 Revenue Model: {analysis.revenue_model.type.upper()}")
    print(f"🔌 Stripe Connected: {'✅ Yes' if analysis.revenue_model.stripe_connected else '❌ No'}")
    print(f"💵 Current MRR: ${analysis.revenue_model.current_mrr:,.2f}")
    print(f"👥 Active Subscriptions: {analysis.revenue_model.active_subscriptions}")
    print(f"🎯 Pricing Tiers: {len(analysis.revenue_model.pricing_tiers)}")

    print(f"\n📈 PERFORMANCE METRICS")
    print(f"   Conversion Rate: {analysis.performance.conversion_rate:.1f}%")
    print(f"   Churn Rate: {analysis.performance.churn_rate:.1f}%")
    print(f"   Avg LTV: ${analysis.performance.avg_ltv:,.2f}")
    print(f"   Avg CAC: ${analysis.performance.avg_cac:,.2f}")
    print(f"   LTV/CAC Ratio: {analysis.performance.ltv_cac_ratio:.1f}x")

    if analysis.recommendations:
        print(f"\n💡 RECOMMENDATIONS")
        for i, rec in enumerate(analysis.recommendations, 1):
            print(f"   {i}. {rec}")

    if args.output:
        analyzer.save_analysis(analysis, args.output)
        print(f"\n✅ Analysis saved to: {args.output}")

    return analysis


def find_opportunities_command(args):
    """Find revenue opportunities from competitors"""
    # Load your current features
    your_features = args.features if args.features else []

    finder = OpportunityFinder(
        competitor_urls=args.competitors,
        your_features=your_features,
        current_mrr=args.mrr
    )

    print(f"🔍 Analyzing {len(args.competitors)} competitors...")
    report = finder.find_opportunities()

    print("\n" + "="*60)
    print("💎 REVENUE OPPORTUNITIES")
    print("="*60)

    print(f"\n💵 Your Current MRR: ${report.your_current_mrr:,.2f}")
    print(f"🚀 Total Potential: +${report.total_potential_revenue:,.2f}/mo")
    print(f"📊 Found {len(report.opportunities)} opportunities")

    if report.top_3_recommendations:
        print(f"\n🏆 TOP 3 RECOMMENDATIONS (by ROI)")
        for rec in report.top_3_recommendations:
            print(f"\n   {rec}")

    if len(report.opportunities) > 3:
        print(f"\n💰 ALL OPPORTUNITIES (sorted by ROI)")
        for i, opp in enumerate(report.opportunities, 1):
            print(f"\n   #{i} {opp.feature.title()}")
            print(f"      Revenue: ${opp.potential_revenue_monthly:,.0f}/mo")
            print(f"      Effort: {opp.implementation_effort_days:.1f} days")
            print(f"      ROI: ${opp.roi_score:,.0f} per day")
            print(f"      Competitors: {', '.join(opp.competitors_charging)}")
            print(f"      Recommendation: {opp.build_vs_buy_recommendation}")

    if args.output:
        finder.save_report(report, args.output)
        print(f"\n✅ Report saved to: {args.output}")

    return report


def weekly_report_command(args):
    """Generate comprehensive weekly revenue report"""
    print("📅 WEEKLY REVENUE REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    # Step 1: Analyze business
    print("\n[1/2] Analyzing current business...")
    business_args = argparse.Namespace(
        stripe_key=args.stripe_key,
        project_dir=args.project_dir,
        output=None
    )
    analysis = analyze_business_command(business_args)

    # Step 2: Find opportunities
    if args.competitors:
        print("\n[2/2] Finding revenue opportunities...")
        opp_args = argparse.Namespace(
            competitors=args.competitors,
            features=args.features if args.features else [],
            mrr=analysis.revenue_model.current_mrr,
            output=None
        )
        report = find_opportunities_command(opp_args)

        # Summary
        print("\n" + "="*60)
        print("📊 WEEKLY SUMMARY")
        print("="*60)
        print(f"Current MRR: ${analysis.revenue_model.current_mrr:,.2f}")
        print(f"Potential Growth: +${report.total_potential_revenue:,.2f}/mo")
        print(f"Growth %: +{(report.total_potential_revenue / max(analysis.revenue_model.current_mrr, 1) * 100):.1f}%")

        if report.top_3_recommendations:
            print(f"\n🎯 FOCUS THIS WEEK:")
            print(f"   {report.top_3_recommendations[0]}")
    else:
        print("\n⚠️ No competitors specified. Run with --competitors to find opportunities.")

    # Save combined report
    if args.output:
        combined_report = {
            "generated_at": datetime.now().isoformat(),
            "business_analysis": {
                "revenue_model": {
                    "type": analysis.revenue_model.type,
                    "stripe_connected": analysis.revenue_model.stripe_connected,
                    "current_mrr": analysis.revenue_model.current_mrr,
                    "active_subscriptions": analysis.revenue_model.active_subscriptions,
                    "pricing_tiers": len(analysis.revenue_model.pricing_tiers)
                },
                "performance": {
                    "conversion_rate": analysis.performance.conversion_rate,
                    "churn_rate": analysis.performance.churn_rate,
                    "ltv_cac_ratio": analysis.performance.ltv_cac_ratio
                },
                "recommendations": analysis.recommendations
            }
        }

        if args.competitors and report:
            combined_report["opportunities"] = {
                "total_potential_revenue": report.total_potential_revenue,
                "opportunity_count": len(report.opportunities),
                "top_3": report.top_3_recommendations
            }

        import json
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(combined_report, f, indent=2)
        print(f"\n✅ Weekly report saved to: {args.output}")


def interactive_bmad_command(args):
    """Launch interactive BMAD spec builder"""
    import json

    builder = InteractiveBMADBuilder()
    spec_data = builder.run()

    if spec_data:
        # Save to output file if specified
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(spec_data, f, indent=2)
            print(f"\n✅ BMAD spec saved to: {args.output}")
            print("\nNext steps:")
            print("  1. Review the spec file")
            print("  2. Use bmad_integration.py to create implementation spec")
        else:
            print("\n📋 Spec data generated (not saved - use --output to save)")
            print(json.dumps(spec_data, indent=2))

        return 0
    else:
        print("\n⚠️ BMAD spec creation cancelled")
        return 1


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Revenue-First System - Find and track revenue opportunities",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze your business
  python -m revenue.cli analyze-business --stripe-key sk_test_xxx

  # Find opportunities from competitors
  python -m revenue.cli find-opportunities \\
    --competitors https://competitor1.com/pricing https://competitor2.com/pricing \\
    --features "user auth" "api access" \\
    --mrr 5000

  # Generate weekly report
  python -m revenue.cli weekly-report \\
    --stripe-key sk_test_xxx \\
    --competitors https://competitor1.com/pricing https://competitor2.com/pricing
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to run')

    # analyze-business command
    business_parser = subparsers.add_parser('analyze-business', help='Analyze current business model')
    business_parser.add_argument('--stripe-key', help='Stripe API key (or set STRIPE_API_KEY env var)')
    business_parser.add_argument('--project-dir', default='.', help='Project directory')
    business_parser.add_argument('--output', help='Save analysis to file')

    # find-opportunities command
    opp_parser = subparsers.add_parser('find-opportunities', help='Find revenue opportunities')
    opp_parser.add_argument('--competitors', nargs='+', required=True, help='Competitor pricing URLs')
    opp_parser.add_argument('--features', nargs='+', help='Your current features')
    opp_parser.add_argument('--mrr', type=float, default=0.0, help='Your current MRR')
    opp_parser.add_argument('--output', help='Save report to file')

    # weekly-report command
    report_parser = subparsers.add_parser('weekly-report', help='Generate weekly revenue report')
    report_parser.add_argument('--stripe-key', help='Stripe API key (or set STRIPE_API_KEY env var)')
    report_parser.add_argument('--project-dir', default='.', help='Project directory')
    report_parser.add_argument('--competitors', nargs='+', help='Competitor pricing URLs')
    report_parser.add_argument('--features', nargs='+', help='Your current features')
    report_parser.add_argument('--output', default='weekly_revenue_report.json', help='Output file')

    # interactive-bmad command
    bmad_parser = subparsers.add_parser('interactive-bmad', help='Interactive BMAD spec builder (categorized questions)')
    bmad_parser.add_argument('--output', help='Save spec data to file (JSON)')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Execute command
    if args.command == 'analyze-business':
        analyze_business_command(args)
    elif args.command == 'find-opportunities':
        find_opportunities_command(args)
    elif args.command == 'weekly-report':
        weekly_report_command(args)
    elif args.command == 'interactive-bmad':
        sys.exit(interactive_bmad_command(args))


if __name__ == '__main__':
    main()
