# Business Spec Builder - How It Works

Complete guide to how the BMAD Builder creates comprehensive product specifications.

---

## 🎯 High-Level Overview

### What Is It?

The **Business Spec Builder** is an interactive wizard that guides you through creating a complete Product Requirements Document (PRD) with business intelligence built in.

Instead of just describing WHAT to build, it forces you to think through:
- **WHO** needs it (target audience)
- **WHY** they'll use it (pain points, value prop)
- **WHAT** competitors offer (market positioning)
- **HOW MUCH** to charge (pricing strategy)
- **HOW** to build it (technical approach)
- **WHEN** you'll ship (timeline)
- **SUCCESS** metrics (validation)

### The Flow

```
User Opens Wizard
      ↓
7-Step Interview Process
      ↓
Answers Business Questions
      ↓
System Validates Input
      ↓
Generates Structured Spec
      ↓
Creates JSON File
      ↓
Ready to Build!
```

---

## 📚 The 7 Categories Explained

### Category 1: Revenue Model
**Question:** "How will you make money from this?"

**Why It Matters:**
- Forces business thinking upfront
- Prevents building features nobody will pay for
- Helps prioritize by revenue potential

**What You Define:**
- Revenue type (subscription, one-time, usage-based, etc.)
- Current baseline (if existing product)
- Target revenue increase
- Timeframe to achieve it

**Output:** Clear revenue goals with measurable targets

---

### Category 2: Target Market
**Question:** "Who is this for?"

**Why It Matters:**
- Defines your ideal customer
- Quantifies market opportunity
- Identifies pain points to solve

**What You Define:**
- Customer segment (who they are)
- Total addressable market (how many exist)
- Expected conversion rate (how many will buy)
- Customer pain points (what problems you solve)

**Output:** Clear audience with quantified opportunity

**Auto-Calculation:**
```
TAM × Conversion Rate = Potential Customers
Example: 10,000 × 2.5% = 250 potential customers
```

---

### Category 3: Competitor Analysis
**Question:** "What already exists in this space?"

**Why It Matters:**
- Prevents reinventing the wheel
- Reveals market pricing expectations
- Helps you position against competition

**What You Define:**
- Competitor list (name, URL, price point)
- Average market price
- Your key differentiators

**Output:** Competitive landscape with pricing benchmarks

**Auto-Calculation:**
```
Average Market Price = Sum of competitor prices / Count
Example: ($99 + $49 + $79) / 3 = $75 average
```

**NEW: GitHub Search Integration**
- Searches for existing open-source projects (MIT license)
- Shows repos you can fork/build upon
- Saves you from rebuilding what already exists
- Includes star count, description, last update

---

### Category 4: Feature Scope
**Question:** "What exactly are you building?"

**Why It Matters:**
- Defines clear boundaries
- Lists specific capabilities
- Articulates core value proposition

**What You Define:**
- Feature name
- Detailed description
- List of capabilities (what it does)
- Core value proposition (why it matters)

**Output:** Crystal-clear feature definition

---

### Category 5: Pricing Strategy
**Question:** "How will you monetize this?"

**Why It Matters:**
- Aligns pricing with value delivered
- Defines discount strategies
- Allows for tiered pricing

**What You Define:**
- Base price point
- Billing frequency (monthly, annual, usage, one-time)
- Discount strategies (annual, volume, enterprise)
- Optional pricing tiers

**Output:** Complete pricing model

---

### Category 6: Implementation Plan
**Question:** "How will you build this?"

**Why It Matters:**
- Defines technical approach
- Estimates effort/timeline
- Identifies dependencies
- Helps with build-vs-buy decisions

**What You Define:**
- Build approach (MVP, phased, full-scope)
- Estimated effort in days
- External dependencies (APIs, services, libraries)
- Technical requirements

**Output:** Technical roadmap with timeline

**Auto-Calculation:**
```
Timeline in weeks = Effort days / 5
Example: 45 days = 9 weeks
```

**NEW: GitHub Starter Projects**
- Suggests existing projects you can fork
- Saves development time
- Reduces effort estimate based on existing code

---

### Category 7: Success Metrics
**Question:** "How will you know it worked?"

**Why It Matters:**
- Defines measurable success
- Creates validation checkpoints
- Allows for early pivots if metrics don't hit

**What You Define:**
- Primary success metric (revenue, users, conversion, etc.)
- 7-day target (early validation)
- 30-day target (first milestone)
- 60-day target (sustained success)
- Secondary metrics (supporting data)

**Output:** Measurable success criteria with progressive targets

**Validation:**
```
60-day > 30-day > 7-day (enforced)
Ensures realistic growth expectations
```

---

## 🔄 Low-Level Technical Flow

### User Interaction → State Management

```
1. User fills form field
   ↓
2. onChange event fires
   │
   └─→ FormField.tsx catches event
        │
        └─→ Calls onChange(value)
             │
             └─→ Form component (e.g., RevenueModelForm)
                  │
                  └─→ handleFieldChange(field, value)
                       │
                       └─→ onChange({ ...answers, [field]: value })
                            │
                            └─→ BMADBuilderDialog.tsx
                                 │
                                 └─→ handleAnswersChange(newAnswers)
                                      │
                                      └─→ setCategories(prev => prev.map(...))
                                           │
                                           └─→ React state updates
                                                │
                                                └─→ Component re-renders
```

### Validation Flow

```
State Updates
   ↓
useEffect triggers (dependency: answers)
   ↓
Validation function runs
   │
   ├─→ Check required fields
   ├─→ Check value ranges (min/max)
   ├─→ Check type constraints
   └─→ Check business rules (e.g., 60d > 30d)
   ↓
Build errors object
   ↓
setErrors(newErrors)
   ↓
onValidationChange(isValid)
   ↓
BMADBuilderDialog receives validation status
   ↓
Next button enables/disables
```

### Navigation Flow

```
User clicks "Next"
   ↓
handleNext() checks validation
   │
   ├─→ If invalid: Show error, block navigation
   │
   └─→ If valid:
        │
        ├─→ Mark current category as completed
        │    setCategories(... { ...cat, completed: true })
        │
        ├─→ Clear error message
        │    setError(null)
        │
        └─→ Advance to next category
             setCurrentCategoryId(categories[currentIndex + 1].id)
             │
             └─→ Dialog re-renders with next form
```

### Spec Generation Flow

```
User clicks "Generate Spec" (on Category 7)
   ↓
handleGenerateSpec() executes
   ↓
1. Mark final category as completed
   ↓
2. Set loading state (isGenerating = true)
   ↓
3. Call IPC:
   window.electronAPI.revenue.generateBMADSpec(projectPath, categories)
   ↓
4. IPC travels through Electron bridge:
   Renderer → Preload API → Main Process
   ↓
5. Main Process (revenue-handlers.ts):
   │
   ├─→ Extract answers from each category:
   │    - categories.find(c => c.id === 'revenue_model')?.answers
   │    - categories.find(c => c.id === 'target_market')?.answers
   │    - ... etc for all 7 categories
   │
   ├─→ Compile into spec object:
   │    {
   │      metadata: { created_via: 'ui_interactive_bmad_builder', ... },
   │      revenue_model: { ... },
   │      target_market: { ... },
   │      competitors: { ... },
   │      features: { ... },
   │      pricing: { ... },
   │      implementation: { ... },
   │      validation: { ... }
   │    }
   │
   └─→ Write to file:
        path.join(projectPath, '.auto-claude', 'bmad_spec_temp.json')
   ↓
6. Return success response
   ↓
7. Frontend receives response
   ↓
8. Call onSpecGenerated(specPath, spec)
   ↓
9. Close dialog
   ↓
10. User sees success!
```

---

## 🔐 Data Safety

### Type Safety Chain

```
User Input (untyped)
   ↓
FormField component (validates type)
   ↓
Form component (typed as RevenueModelAnswers, etc.)
   ↓
Dialog state (typed as BMADCategory[])
   ↓
IPC call (typed parameters)
   ↓
Preload API (typed RevenueAPI interface)
   ↓
Main Process (typed BMADSpec)
   ↓
JSON file (validated structure)
```

**Every step is type-checked by TypeScript!**

### Validation Layers

**Layer 1: Browser**
- Number inputs only accept numbers
- Min/max attributes enforced
- Required attributes block form submission

**Layer 2: React Components**
- Real-time validation on every change
- Error messages displayed immediately
- Next button disabled until valid

**Layer 3: Dialog Orchestration**
- Blocks navigation to next category
- Validates before spec generation
- Shows aggregate errors

**Layer 4: Backend (Future)**
- Could add server-side validation
- Currently trusts frontend validation

---

## 🆕 NEW: GitHub Starter Project Search

### How It Works

When in **Implementation Plan** category, after you describe what you're building, the system will:

```
1. Take your feature description
   ↓
2. Search GitHub for:
   - Repos matching description keywords
   - MIT/Apache/BSD licensed (forkable)
   - 100+ stars (quality filter)
   - Active (updated in last year)
   ↓
3. Show you top 5 matches:
   ┌────────────────────────────────────────┐
   │ 📦 recharts/recharts                   │
   │ ⭐ 24,500 stars | MIT License          │
   │ 🔄 Updated 2 days ago                  │
   │ "React charting library"               │
   │ [Use as Starting Point]                │
   └────────────────────────────────────────┘
   ↓
4. You pick one (or skip)
   ↓
5. Adds to your spec:
   {
     "starting_point": {
       "github_repo": "recharts/recharts",
       "license": "MIT",
       "stars": 24500,
       "why_chosen": "Mature charting library, saves 2 weeks"
     }
   }
   ↓
6. Reduces your effort estimate automatically
   - Original: 45 days
   - With starter: 30 days (-15 days saved)
```

### Benefits

**For Users:**
- ✅ Don't reinvent the wheel
- ✅ Start with battle-tested code
- ✅ Reduce development time 50-80%
- ✅ Learn from existing patterns

**For Product:**
- ✅ More realistic estimates
- ✅ Faster time to market
- ✅ Higher quality (standing on shoulders of giants)
- ✅ Open-source leverage

---

## 🏗️ Architecture Additions

### New Components Needed:

1. **GitHubSearchForm.tsx** (Category 8 or part of Implementation)
2. **GitHubRepoCard.tsx** (displays search results)
3. **github-search-api.ts** (IPC wrapper for GitHub API)
4. **GitHub search handler** (main process, uses existing GitHub integration)

### Integration Points:

```
Implementation Plan Form
   ↓
User fills technical requirements
   ↓
"Search GitHub for starter projects" button
   ↓
Calls: searchGitHubProjects(featureDescription, techStack)
   ↓
Returns: Top 5 MIT-licensed repos
   ↓
User selects one
   ↓
Adds to spec + reduces effort estimate
```

---

## 📊 Complete Data Flow (With GitHub Search)

```
Category 1-3: Business Planning
   ↓ (revenue, market, competitors)

Category 4: Feature Scope
   ↓ (what you're building)

Category 5: Pricing
   ↓ (how you'll charge)

Category 6: Implementation Plan
   ↓
   ├─→ Enter tech requirements
   ├─→ [NEW] Search GitHub for starter projects
   │    │
   │    ├─→ Finds: "recharts/recharts" (24k stars, MIT)
   │    ├─→ Finds: "react-chartjs/react-chartjs-2" (6k stars, MIT)
   │    ├─→ Finds: "Victory/victory" (11k stars, MIT)
   │    │
   │    └─→ User picks recharts
   │         │
   │         ├─→ Adds to spec.implementation.starting_point
   │         └─→ Reduces estimatedEffortDays (45 → 30 days)
   │
   └─→ Continue with dependencies, timeline

Category 7: Success Metrics
   ↓

Generate Spec with starting point included!
```

---

## 🎯 Want Me To Build This?

I can add:

1. **Category 8: Starting Point** (or integrate into Implementation Plan)
   - GitHub project search
   - MIT/Apache/BSD license filter
   - Star count ranking
   - Repo selection
   - Auto-adjust effort estimate

2. **Enhanced Documentation:**
   - High-level flow diagrams
   - Low-level code paths
   - Architecture decisions
   - Data structures

3. **GitHub Integration:**
   - Use existing GitHub API
   - Search by keywords from feature description
   - Filter by license
   - Show stars, last update, description
   - One-click select

**This would make your Business Spec Builder WAY more valuable!**

Instead of just planning, you'd be **finding existing code to build on**. Smart as hell.

Want me to build it?