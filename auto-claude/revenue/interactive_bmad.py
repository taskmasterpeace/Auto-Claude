"""
Interactive BMAD Spec Builder
==============================

Categorized question system for building revenue-first specs.
Users navigate through categories and select options to build their BMAD spec.
"""

import sys
from pathlib import Path
from typing import Dict, List, Optional

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from ui import (
    Icons,
    MenuOption,
    box,
    bold,
    highlight,
    icon,
    muted,
    print_status,
    select_menu,
)


class BMADCategory:
    """A category of questions for BMAD spec building"""

    def __init__(self, name: str, description: str, icon_type: tuple):
        self.name = name
        self.description = description
        self.icon_type = icon_type
        self.answers = {}
        self.completed = False


class InteractiveBMADBuilder:
    """Interactive BMAD spec builder with categorized questions"""

    def __init__(self):
        self.categories = {
            "revenue_model": BMADCategory(
                "Revenue Model",
                "How will this feature generate revenue?",
                Icons.MONEY
            ),
            "target_market": BMADCategory(
                "Target Market",
                "Who will pay for this feature?",
                Icons.USER
            ),
            "competitors": BMADCategory(
                "Competitor Analysis",
                "What are competitors charging?",
                Icons.SEARCH
            ),
            "features": BMADCategory(
                "Feature Scope",
                "What exactly are you building?",
                Icons.CHECKLIST
            ),
            "pricing": BMADCategory(
                "Pricing Strategy",
                "How much will you charge?",
                Icons.DOLLAR
            ),
            "implementation": BMADCategory(
                "Implementation Plan",
                "Build vs buy decisions",
                Icons.GEAR
            ),
            "validation": BMADCategory(
                "Success Metrics",
                "How will you measure success?",
                Icons.CHART
            ),
        }

        self.spec_data = {}

    def run(self) -> Optional[Dict]:
        """
        Run the interactive BMAD builder

        Returns:
            Dictionary with spec data, or None if cancelled
        """
        # Show welcome
        self._show_welcome()

        # Main loop: show category menu
        while True:
            choice = self._show_category_menu()

            if choice is None or choice == "quit":
                return None

            if choice == "done":
                # Check if all categories are complete
                incomplete = [c for c in self.categories.values() if not c.completed]
                if incomplete:
                    print()
                    print_status(
                        f"Please complete all categories first: {', '.join(c.name for c in incomplete)}",
                        "warning"
                    )
                    input("\nPress Enter to continue...")
                    continue

                # Generate spec
                return self._generate_spec()

            # Handle category selection
            if choice in self.categories:
                self._handle_category(choice)

    def _show_welcome(self):
        """Show welcome message"""
        print()
        content = [
            bold(f"{icon(Icons.MONEY)} BMAD SPEC BUILDER"),
            "",
            "Build a revenue-first feature spec by answering questions in categories.",
            "",
            muted("Navigate through each category to complete your spec."),
            muted("All categories must be completed to generate the spec."),
        ]
        print(box(content, width=70, style="heavy"))
        print()

    def _show_category_menu(self) -> Optional[str]:
        """Show main category selection menu"""
        options = []

        for key, category in self.categories.items():
            status_icon = Icons.SUCCESS if category.completed else Icons.PENDING
            options.append(
                MenuOption(
                    key=key,
                    label=category.name,
                    icon=status_icon,
                    description=category.description,
                )
            )

        options.append(
            MenuOption(
                key="done",
                label="Generate Spec",
                icon=Icons.COMPLETE,
                description="Create the BMAD spec (completes all categories first)",
            )
        )

        options.append(
            MenuOption(
                key="quit",
                label="Cancel",
                icon=Icons.DOOR,
                description="Exit without saving",
            )
        )

        return select_menu(
            title="BMAD Categories",
            options=options,
            subtitle="Select a category to answer questions",
            allow_quit=False,
        )

    def _handle_category(self, category_key: str):
        """Handle questions for a specific category"""
        category = self.categories[category_key]

        # Route to specific category handler
        handlers = {
            "revenue_model": self._handle_revenue_model,
            "target_market": self._handle_target_market,
            "competitors": self._handle_competitors,
            "features": self._handle_features,
            "pricing": self._handle_pricing,
            "implementation": self._handle_implementation,
            "validation": self._handle_validation,
        }

        handler = handlers.get(category_key)
        if handler:
            completed = handler(category)
            if completed:
                category.completed = True

    def _handle_revenue_model(self, category: BMADCategory) -> bool:
        """Handle revenue model questions"""
        print()
        content = [
            bold(f"{icon(category.icon_type)} {category.name}"),
            "",
            category.description,
        ]
        print(box(content, width=70, style="heavy"))
        print()

        # Question 1: Revenue type
        options = [
            MenuOption("subscription", "Subscription/Recurring", Icons.LOOP, "Monthly/annual recurring revenue"),
            MenuOption("one_time", "One-Time Purchase", Icons.DOLLAR, "Single payment per customer"),
            MenuOption("usage", "Usage-Based", Icons.CHART, "Pay per use/API calls"),
            MenuOption("freemium", "Freemium Upgrade", Icons.ARROW_UP, "Free tier + paid upgrade"),
            MenuOption("addon", "Add-On/Upsell", Icons.PLUS, "Additional feature for existing customers"),
        ]

        revenue_type = select_menu(
            title="Revenue Type",
            options=options,
            subtitle="How will this feature generate revenue?",
        )

        if not revenue_type:
            return False

        category.answers["revenue_type"] = revenue_type

        # Question 2: Current MRR
        print()
        print(bold("What is your current Monthly Recurring Revenue (MRR)?"))
        print(muted("Enter 0 if you're just starting out"))
        try:
            mrr_input = input(f"  {icon(Icons.DOLLAR)} MRR ($): ").strip()
            mrr = float(mrr_input.replace(",", "").replace("$", ""))
            category.answers["current_mrr"] = mrr
        except (ValueError, KeyboardInterrupt):
            return False

        # Question 3: Target revenue
        print()
        print(bold("What's your target monthly revenue from this feature?"))
        print(muted("Be realistic based on market size and pricing"))
        try:
            target_input = input(f"  {icon(Icons.CHART)} Target ($): ").strip()
            target = float(target_input.replace(",", "").replace("$", ""))
            category.answers["target_revenue"] = target
        except (ValueError, KeyboardInterrupt):
            return False

        return True

    def _handle_target_market(self, category: BMADCategory) -> bool:
        """Handle target market questions"""
        print()
        content = [
            bold(f"{icon(category.icon_type)} {category.name}"),
            "",
            category.description,
        ]
        print(box(content, width=70, style="heavy"))
        print()

        # Question 1: Customer segment
        options = [
            MenuOption("smb", "Small Business (1-50 employees)", Icons.BUILDING, "Local businesses, startups"),
            MenuOption("midmarket", "Mid-Market (51-1000 employees)", Icons.BUILDING, "Growing companies"),
            MenuOption("enterprise", "Enterprise (1000+ employees)", Icons.BUILDING, "Large corporations"),
            MenuOption("prosumer", "Professional/Prosumer", Icons.USER, "Power users, freelancers"),
            MenuOption("consumer", "Consumer/Hobbyist", Icons.USER, "General public, enthusiasts"),
        ]

        segment = select_menu(
            title="Customer Segment",
            options=options,
            subtitle="Who are your target customers?",
        )

        if not segment:
            return False

        category.answers["customer_segment"] = segment

        # Question 2: Market size
        print()
        print(bold("How many potential paying customers exist?"))
        print(muted("Your total addressable market for this feature"))
        try:
            market_size = input(f"  {icon(Icons.USERS)} Potential customers: ").strip()
            category.answers["market_size"] = int(market_size.replace(",", ""))
        except (ValueError, KeyboardInterrupt):
            return False

        # Question 3: Conversion rate
        print()
        print(bold("What conversion rate do you expect?"))
        print(muted("% of users who will pay for this feature (typical: 2-5%)"))
        try:
            conversion_input = input(f"  {icon(Icons.PERCENT)} Conversion rate (%): ").strip()
            conversion = float(conversion_input.replace("%", ""))
            category.answers["conversion_rate"] = conversion
        except (ValueError, KeyboardInterrupt):
            return False

        return True

    def _handle_competitors(self, category: BMADCategory) -> bool:
        """Handle competitor analysis questions"""
        print()
        content = [
            bold(f"{icon(category.icon_type)} {category.name}"),
            "",
            category.description,
        ]
        print(box(content, width=70, style="heavy"))
        print()

        # Collect competitor URLs
        print(bold("Enter competitor pricing page URLs"))
        print(muted("We'll analyze what they charge for similar features"))
        print(muted("Enter one URL per line, blank line when done"))
        print()

        competitors = []
        while True:
            try:
                url = input(f"  {icon(Icons.LINK)} URL: ").strip()
                if not url:
                    break
                competitors.append(url)
            except KeyboardInterrupt:
                return False

        if not competitors:
            print()
            print_status("No competitors added - you should analyze at least 2-3", "warning")
            return False

        category.answers["competitor_urls"] = competitors

        # Average competitor price
        print()
        print(bold("What's the average price competitors charge?"))
        print(muted("Estimate based on their pricing pages"))
        try:
            price_input = input(f"  {icon(Icons.DOLLAR)} Avg price ($): ").strip()
            price = float(price_input.replace(",", "").replace("$", ""))
            category.answers["avg_competitor_price"] = price
        except (ValueError, KeyboardInterrupt):
            return False

        return True

    def _handle_features(self, category: BMADCategory) -> bool:
        """Handle feature scope questions"""
        print()
        content = [
            bold(f"{icon(category.icon_type)} {category.name}"),
            "",
            category.description,
        ]
        print(box(content, width=70, style="heavy"))
        print()

        # Feature name
        print(bold("What's the feature name?"))
        print(muted("Short, memorable name (e.g., 'Advanced Analytics', 'API Access')"))
        try:
            feature_name = input(f"  {icon(Icons.TAG)} Name: ").strip()
            if not feature_name:
                return False
            category.answers["feature_name"] = feature_name
        except KeyboardInterrupt:
            return False

        # Feature description
        print()
        print(bold("Describe the feature in 1-2 sentences"))
        print(muted("What problem does it solve? What value does it provide?"))
        print()
        try:
            description_lines = []
            while True:
                line = input("  > " if not description_lines else "    ").strip()
                if not line:
                    break
                description_lines.append(line)

            description = " ".join(description_lines)
            if not description:
                return False
            category.answers["description"] = description
        except KeyboardInterrupt:
            return False

        # Core capabilities
        print()
        print(bold("List core capabilities (one per line, blank when done)"))
        print(muted("e.g., 'Real-time dashboards', 'Export to PDF', 'Custom fields'"))
        print()

        capabilities = []
        while True:
            try:
                cap = input(f"  {icon(Icons.CHECKLIST)} ").strip()
                if not cap:
                    break
                capabilities.append(cap)
            except KeyboardInterrupt:
                return False

        category.answers["capabilities"] = capabilities

        return True

    def _handle_pricing(self, category: BMADCategory) -> bool:
        """Handle pricing strategy questions"""
        print()
        content = [
            bold(f"{icon(category.icon_type)} {category.name}"),
            "",
            category.description,
        ]
        print(box(content, width=70, style="heavy"))
        print()

        # Price point
        print(bold("How much will you charge for this feature?"))
        print(muted("Consider competitor pricing and value delivered"))
        try:
            price_input = input(f"  {icon(Icons.DOLLAR)} Price ($): ").strip()
            price = float(price_input.replace(",", "").replace("$", ""))
            category.answers["price"] = price
        except (ValueError, KeyboardInterrupt):
            return False

        # Billing frequency
        options = [
            MenuOption("monthly", "Monthly", Icons.CALENDAR, "$X per month"),
            MenuOption("annual", "Annual", Icons.CALENDAR, "$X per year (usually ~10mo)"),
            MenuOption("one_time", "One-Time", Icons.DOLLAR, "Single payment"),
            MenuOption("usage", "Usage-Based", Icons.CHART, "Per API call / per GB / etc"),
        ]

        billing = select_menu(
            title="Billing Frequency",
            options=options,
            subtitle="How often do customers pay?",
        )

        if not billing:
            return False

        category.answers["billing_frequency"] = billing

        # Discount strategy
        print()
        print(bold("Will you offer early-bird or volume discounts?"))
        print(muted("Y/n"))
        discount = input(f"  {icon(Icons.PERCENT)} Discounts? ").strip().lower()
        category.answers["has_discounts"] = discount in ["y", "yes", ""]

        return True

    def _handle_implementation(self, category: BMADCategory) -> bool:
        """Handle implementation questions"""
        print()
        content = [
            bold(f"{icon(category.icon_type)} {category.name}"),
            "",
            category.description,
        ]
        print(box(content, width=70, style="heavy"))
        print()

        # Build vs Buy
        options = [
            MenuOption("build", "Build from Scratch", Icons.HAMMER, "Custom implementation"),
            MenuOption("library", "Use Open Source Library", Icons.PACKAGE, "Integrate existing solution"),
            MenuOption("api", "Use Third-Party API/Service", Icons.CLOUD, "SaaS integration"),
            MenuOption("hybrid", "Hybrid Approach", Icons.LAYERS, "Combine multiple approaches"),
        ]

        approach = select_menu(
            title="Implementation Approach",
            options=options,
            subtitle="How will you build this?",
        )

        if not approach:
            return False

        category.answers["build_approach"] = approach

        # Estimated effort
        print()
        print(bold("How many days to implement?"))
        print(muted("Be realistic: 1-2 days = simple, 5-10 days = moderate, 15+ days = complex"))
        try:
            effort = input(f"  {icon(Icons.CALENDAR)} Days: ").strip()
            category.answers["effort_days"] = float(effort)
        except (ValueError, KeyboardInterrupt):
            return False

        # Dependencies
        print()
        print(bold("List major dependencies or libraries (blank when done)"))
        print(muted("e.g., 'recharts', 'stripe-js', 'puppeteer'"))
        print()

        dependencies = []
        while True:
            try:
                dep = input(f"  {icon(Icons.PACKAGE)} ").strip()
                if not dep:
                    break
                dependencies.append(dep)
            except KeyboardInterrupt:
                return False

        category.answers["dependencies"] = dependencies

        return True

    def _handle_validation(self, category: BMADCategory) -> bool:
        """Handle success metrics questions"""
        print()
        content = [
            bold(f"{icon(category.icon_type)} {category.name}"),
            "",
            category.description,
        ]
        print(box(content, width=70, style="heavy"))
        print()

        # Success metrics
        print(bold("How will you measure success?"))
        print(muted("Select primary success metric"))

        options = [
            MenuOption("revenue", "Revenue Generated", Icons.MONEY, "Track actual $ earned"),
            MenuOption("adoption", "Feature Adoption Rate", Icons.USERS, "% of users using feature"),
            MenuOption("conversion", "Conversion to Paid", Icons.ARROW_UP, "Free → Paid conversion"),
            MenuOption("retention", "Customer Retention", Icons.LOOP, "Reduced churn rate"),
            MenuOption("usage", "Usage Metrics", Icons.CHART, "API calls, exports, etc"),
        ]

        metric = select_menu(
            title="Primary Success Metric",
            options=options,
            subtitle="What's the #1 metric to track?",
        )

        if not metric:
            return False

        category.answers["primary_metric"] = metric

        # 7-day target
        print()
        print(bold("What's your 7-day post-launch target?"))
        print(muted("Revenue target for week 1 (be conservative)"))
        try:
            day7 = input(f"  {icon(Icons.CHART)} 7-day revenue ($): ").strip()
            category.answers["day7_target"] = float(day7.replace(",", "").replace("$", ""))
        except (ValueError, KeyboardInterrupt):
            return False

        # 30-day target
        print()
        print(bold("What's your 30-day target?"))
        print(muted("Revenue target for month 1"))
        try:
            day30 = input(f"  {icon(Icons.CHART)} 30-day revenue ($): ").strip()
            category.answers["day30_target"] = float(day30.replace(",", "").replace("$", ""))
        except (ValueError, KeyboardInterrupt):
            return False

        return True

    def _generate_spec(self) -> Dict:
        """Generate the final spec data from all categories"""
        # Compile all answers into a structured spec
        spec = {
            "metadata": {
                "created_via": "interactive_bmad_builder",
                "version": "1.0",
            },
            "revenue_model": self.categories["revenue_model"].answers,
            "target_market": self.categories["target_market"].answers,
            "competitors": self.categories["competitors"].answers,
            "features": self.categories["features"].answers,
            "pricing": self.categories["pricing"].answers,
            "implementation": self.categories["implementation"].answers,
            "validation": self.categories["validation"].answers,
        }

        # Show summary
        print()

        price_str = f"${spec['pricing']['price']:,.2f}"
        target_str = f"${spec['revenue_model']['target_revenue']:,.2f}/mo"

        content = [
            bold(f"{icon(Icons.SUCCESS)} BMAD SPEC COMPLETE"),
            "",
            f"Feature: {highlight(spec['features']['feature_name'])}",
            f"Price: {highlight(price_str)}",
            f"Target Revenue: {highlight(target_str)}",
            f"Implementation: {spec['implementation']['effort_days']:.0f} days",
            "",
            muted("Spec data has been generated!"),
        ]
        print(box(content, width=70, style="heavy"))
        print()

        return spec


def main():
    """CLI entry point"""
    try:
        builder = InteractiveBMADBuilder()
        spec_data = builder.run()

        if spec_data:
            # TODO: Save spec to file or pass to BMAD integrator
            print()
            print_status("Spec generated successfully!", "success")
            print(f"\nNext: Use this data to create a BMAD spec via bmad_integration.py")
            return 0
        else:
            print()
            print_status("Cancelled", "warning")
            return 1

    except KeyboardInterrupt:
        print()
        print_status("\nCancelled by user", "warning")
        return 1
    except Exception as e:
        print()
        print_status(f"Error: {e}", "error")
        return 1


if __name__ == "__main__":
    sys.exit(main())
