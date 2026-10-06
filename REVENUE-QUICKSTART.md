# Revenue-First System - Quick Start Guide

Get started with the Revenue-First System in 5 minutes.

## What Is This?

The Revenue-First System analyzes your SaaS business and finds money-making opportunities by analyzing competitors. Every suggestion answers: **"How much money does this make?"**

## Installation

```bash
# 1. Install dependencies
cd auto-claude
pip install stripe beautifulsoup4 requests

# 2. Configure (optional but recommended)
cp .env.example .env
# Edit .env and add (if you have them):
# STRIPE_API_KEY=sk_test_xxx
# GITHUB_TOKEN=ghp_xxx
```

## Quick Demo (No Setup Required)

Try it without Stripe or GitHub:

```bash
# Analyze business (will use fallback data without Stripe)
python -m revenue.cli analyze-business

# Find opportunities from competitors
python -m revenue.cli find-opportunities \
  --competitors \
    https://stripe.com/pricing \
    https://plaid.com/pricing \
  --features "api access" "webhooks" \
  --mrr 5000
```

## Real Usage (With Stripe)

### 1. Get Your Stripe API Key

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Test** API key (starts with `sk_test_`)
3. Add to `.env`: `STRIPE_API_KEY=sk_test_xxx`

### 2. Analyze Your Business

```bash
python -m revenue.cli analyze-business --output business.json
```

**You'll see**:
```
💰 BUSINESS ANALYSIS
============================================================
📊 Revenue Model: FREEMIUM
💵 Current MRR: $12,450.00
👥 Active Subscriptions: 247
📈 Conversion Rate: 3.2%
💡 RECOMMENDATIONS
   1. Consider adding more pricing tiers...
```

### 3. Find Revenue Opportunities

```bash
python -m revenue.cli find-opportunities \
  --competitors \
    https://competitor1.com/pricing \
    https://competitor2.com/pricing \
  --features "user auth" "api access" "webhooks" \
  --mrr 12450 \
  --output opportunities.json
```

**You'll see**:
```
💎 REVENUE OPPORTUNITIES
============================================================
💵 Your Current MRR: $12,450.00
🚀 Total Potential: +$8,750.00/mo
📊 Found 5 opportunities

🏆 TOP 3 RECOMMENDATIONS (by ROI)

   #1 Analytics Dashboard: $3,200/mo potential
   (3 competitors charge $50). USE LIBRARY - recharts/recharts
   (23,500 stars) instead of building from scratch
```

### 4. Generate Weekly Report

```bash
python -m revenue.cli weekly-report \
  --competitors \
    https://competitor1.com/pricing \
    https://competitor2.com/pricing \
  --features "user auth" "api access"
```

**You'll see**:
```
📅 WEEKLY REVENUE REPORT
============================================================
Current MRR: $12,450.00
Potential Growth: +$8,750.00/mo
Growth %: +70.3%

🎯 FOCUS THIS WEEK:
   #1 Analytics Dashboard: $3,200/mo potential...
```

## Advanced: Auto-Create BMAD Specs

### Option 1: Interactive Builder (Recommended)

Answer categorized questions to build your BMAD spec:

```bash
python -m revenue.cli interactive-bmad --output bmad_spec.json
```

Navigate through categories:
- 💰 **Revenue Model**: How will this generate revenue?
- 👤 **Target Market**: Who will pay for this?
- 🔍 **Competitor Analysis**: What do competitors charge?
- ☑ **Feature Scope**: What are you building?
- 💵 **Pricing Strategy**: How much will you charge?
- ⚙ **Implementation Plan**: Build vs buy decisions
- 📊 **Success Metrics**: How will you measure success?

### Option 2: Automated from Competitors

Turn competitor analysis into implementation specs:

```bash
# 1. Find opportunities
python -m revenue.cli find-opportunities \
  --competitors https://competitor.com/pricing \
  --features "auth" "api" \
  --mrr 5000 \
  --output opportunities.json

# 2. Analyze business
python -m revenue.cli analyze-business --output business.json

# 3. Create BMAD spec from #1 opportunity (highest ROI)
python -m revenue.bmad_integration \
  --opportunity-file opportunities.json \
  --business-file business.json \
  --rank 1

# 4. Run BMAD to implement (auto-detects revenue tracking)
python auto-claude/run.py --spec 001
```

## Real-World Example

Let's say you have a project management SaaS competing with Asana and Monday.com:

```bash
# 1. Analyze your business
python -m revenue.cli analyze-business --output business.json
# Output: Current MRR: $5,000

# 2. Find what features competitors charge for
python -m revenue.cli find-opportunities \
  --competitors \
    https://asana.com/pricing \
    https://monday.com/pricing \
  --features "tasks" "projects" "team collaboration" \
  --mrr 5000 \
  --output opportunities.json

# Output: Found opportunities:
#   1. Advanced Analytics: $2,500/mo potential (both competitors charge $40)
#   2. Time Tracking: $1,800/mo potential (both competitors charge $30)
#   3. Custom Fields: $1,200/mo potential (both competitors charge $20)

# 3. Create spec for #1 (Analytics)
python -m revenue.bmad_integration \
  --opportunity-file opportunities.json \
  --business-file business.json \
  --rank 1
# Output: Created spec 001-revenue-advanced-analytics

# 4. Implement it (auto-detects revenue tracking)
python auto-claude/run.py --spec 001
```

## GitHub Library Research (Optional)

Add GitHub token for automatic library research:

1. Go to https://github.com/settings/tokens
2. Create token with `public_repo` permission
3. Add to `.env`: `GITHUB_TOKEN=ghp_xxx`

Now the system will automatically find high-quality libraries (10k+ stars) to avoid rebuilding existing solutions.

## Output Files

All commands save JSON files you can process programmatically:

**business_analysis.json**:
```json
{
  "revenue_model": {
    "current_mrr": 12450.00,
    "active_subscriptions": 247,
    "pricing_tiers": [...]
  },
  "recommendations": [...]
}
```

**opportunities.json**:
```json
{
  "total_potential_revenue": 8750.00,
  "opportunities": [
    {
      "feature": "analytics dashboard",
      "potential_revenue_monthly": 3200.00,
      "roi_score": 640.00,
      "build_vs_buy_recommendation": "USE LIBRARY..."
    }
  ]
}
```

## Common Use Cases

### Use Case 1: Weekly Revenue Review
```bash
# Run every Monday
python -m revenue.cli weekly-report \
  --competitors https://competitor.com/pricing \
  --output weekly_report_$(date +%Y%m%d).json
```

### Use Case 2: Competitor Analysis
```bash
# Compare yourself to 5 competitors
python -m revenue.cli find-opportunities \
  --competitors \
    https://competitor1.com/pricing \
    https://competitor2.com/pricing \
    https://competitor3.com/pricing \
    https://competitor4.com/pricing \
    https://competitor5.com/pricing \
  --features "your" "current" "features" \
  --mrr 10000
```

### Use Case 3: Feature Prioritization
```bash
# Get ranked list of what to build next (by ROI)
python -m revenue.cli find-opportunities \
  --competitors ... \
  --features ... \
  --mrr ... \
  --output prioritized_features.json

# Top 3 features are now your roadmap!
```

## Troubleshooting

### "No Stripe API key found"
**Fix**: Either set `STRIPE_API_KEY` in `.env` or pass `--stripe-key sk_test_xxx`

### "Could not extract pricing from URL"
**Reason**: HTML structure varies across websites. Some sites are harder to scrape.
**Fix**: Try different competitor URLs or wait for Week 2 (AI-powered scraping)

### "No opportunities found"
**Reason**: Either competitors don't have public pricing, or you already have all their features.
**Fix**:
- Use competitors with transparent pricing pages
- Reduce your `--features` list to see more gaps

### Tests failing on Windows
**Fix**: Already handled! All path separators normalized for cross-platform compatibility.

## What's Next?

After Week 1 (current), you can:
1. **Use it now**: Find real opportunities in your SaaS
2. **Wait for Week 2**: AI-powered effort estimation + synthetic testing
3. **Wait for Week 3**: Automated tracking, email reports

## Help & Support

- **Documentation**: See `auto-claude/revenue/README.md`
- **Implementation Details**: See `docs/REVENUE-SYSTEM-IMPLEMENTATION.md`
- **Design**: See `docs/REVENUE-FIRST-SYSTEM.md`
- **Issues**: https://github.com/taskmasterpeace/Auto-Claude/issues

## One-Liner Demos

```bash
# Analyze business
python -m revenue.cli analyze-business

# Find opportunities
python -m revenue.cli find-opportunities --competitors https://stripe.com/pricing --features "api" --mrr 5000

# Weekly report
python -m revenue.cli weekly-report --competitors https://stripe.com/pricing

# Full workflow
python -m revenue.cli weekly-report --competitors https://competitor.com/pricing && \
python -m revenue.bmad_integration --opportunity-file opportunities.json --business-file business.json --rank 1 && \
python auto-claude/run.py --spec 001
```

## Success!

You now have a system that:
- ✅ Analyzes your SaaS revenue
- ✅ Finds what competitors charge for
- ✅ Calculates ROI for each feature
- ✅ Finds GitHub libraries (don't rebuild!)
- ✅ Creates BMAD specs automatically
- ✅ Answers: "How much money does this make?"

Start finding revenue opportunities now! 🚀
