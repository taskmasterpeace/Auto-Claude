# BMAD Builder UI Component

Interactive wizard for building comprehensive product specifications with business thinking built in.

## Overview

The BMAD (Business Model, Audience, Differentiators) Builder guides users through creating complete product specs by collecting information across 7 key categories:

1. **Revenue Model** - Business model and revenue goals
2. **Target Market** - Target audience and market opportunity
3. **Competitor Analysis** - Market positioning and competitive landscape
4. **Feature Scope** - What you're building and why
5. **Pricing Strategy** - Pricing model and value proposition
6. **Implementation Plan** - Technical approach and timeline
7. **Success Metrics** - How you'll measure success

**This is a PRD (Product Requirements Document) with business intelligence.** It helps you think through not just WHAT to build, but WHO it's for, WHY they'll pay, and HOW you'll measure success.

## Installation & Integration

### 1. Import the Component

```typescript
import { BMADBuilderDialog } from '@/components/bmad';
import { DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
```

### 2. Add State Management

```typescript
const [showBMADBuilder, setShowBMADBuilder] = useState(false);
const [currentProject, setCurrentProject] = useState<Project | null>(null);
```

### 3. Add UI Entry Point

Add a button to launch the BMAD Builder dialog. Suggested locations:

- **Main Dashboard** - Add to project actions section
- **Project Screen** - Add to toolbar or quick actions
- **Roadmap View** - Add next to "Add Feature" button
- **Spec Creation Menu** - Add as an alternative spec creation method

Example:

```tsx
<Button onClick={() => setShowBMADBuilder(true)}>
  <DollarSign className="mr-2 h-4 w-4" />
  Business Spec
</Button>
```

### 4. Add Dialog Component

```tsx
<BMADBuilderDialog
  open={showBMADBuilder}
  onOpenChange={setShowBMADBuilder}
  projectPath={currentProject?.path || ''}
  onSpecGenerated={(specPath, spec) => {
    console.log('BMAD spec generated:', specPath);
    // Handle spec generation success
    // - Show success toast
    // - Navigate to spec view
    // - Refresh spec list
  }}
/>
```

## Component Props

### BMADBuilderDialog

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | Yes | Whether the dialog is open |
| `onOpenChange` | `(open: boolean) => void` | Yes | Callback when dialog open state changes |
| `projectPath` | `string` | Yes | Absolute path to the project directory |
| `onSpecGenerated` | `(specPath: string, spec: BMADSpec) => void` | No | Callback when spec is successfully generated |
| `initialData` | `Partial<BMADSpec>` | No | Pre-populate form with existing data |

## Example Integration Locations

### 1. Dashboard Integration

```tsx
// In Dashboard.tsx or ProjectDashboard.tsx
<div className="actions">
  <Button onClick={() => setShowAddFeature(true)}>
    Add Feature
  </Button>
  <Button onClick={() => setShowBMADBuilder(true)} variant="secondary">
    <DollarSign className="mr-2 h-4 w-4" />
    Business Spec
  </Button>
</div>
```

### 2. Roadmap Integration

```tsx
// In RoadmapView.tsx
<div className="toolbar">
  <Button onClick={() => setShowAddFeature(true)}>
    Add Feature
  </Button>
  <Button onClick={() => setShowBMADBuilder(true)} variant="outline">
    <DollarSign className="mr-2 h-4 w-4" />
    BMAD Builder
  </Button>
</div>
```

### 3. Spec Creation Menu

```tsx
// In SpecCreationMenu.tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Create Spec</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setShowBasicSpec(true)}>
      Basic Spec
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setShowBMADBuilder(true)}>
      <DollarSign className="mr-2 h-4 w-4" />
      Business Spec (BMAD)
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Generated Spec Format

The BMAD Builder generates a JSON spec file at `.auto-claude/bmad_spec_temp.json`:

```json
{
  "metadata": {
    "created_via": "ui_interactive_bmad_builder",
    "version": "1.0"
  },
  "revenue_model": {
    "revenueType": "subscription",
    "currentMRR": 5000,
    "targetRevenue": 10000,
    "timeframe": "60-days"
  },
  "target_market": {
    "customerSegment": "B2B SaaS companies",
    "marketSize": 10000,
    "expectedConversionRate": 2.5,
    "customerPainPoints": ["..."]
  },
  "competitors": {
    "competitors": [...],
    "averageMarketPrice": 99,
    "keyDifferentiators": "..."
  },
  "features": {
    "featureName": "...",
    "description": "...",
    "capabilities": [...],
    "coreValue": "..."
  },
  "pricing": {
    "pricePoint": 99,
    "billingFrequency": "monthly",
    "discounts": {...},
    "pricingTiers": [...]
  },
  "implementation": {
    "buildApproach": "mvp",
    "estimatedEffortDays": 30,
    "dependencies": [...],
    "technicalRequirements": "..."
  },
  "validation": {
    "primaryMetric": "revenue",
    "sevenDayTarget": 500,
    "thirtyDayTarget": 2000,
    "sixtyDayTarget": 5000,
    "secondaryMetrics": [...]
  }
}
```

## IPC Communication

The component uses the following IPC channels:

- `revenue:get-bmad-categories` - Get initial category structure
- `revenue:generate-bmad-spec` - Generate final spec from answers

These are handled by `revenue-handlers.ts` in the main process.

## State Management

The dialog maintains its own internal state for:
- Current category navigation
- Form answers for each category
- Validation status
- Loading/error states

Parent components only need to manage:
- Dialog open/close state
- Post-generation handling

## Styling

The component uses:
- shadcn/ui components (Dialog, Button, Input, Select, etc.)
- Tailwind CSS for styling
- lucide-react for icons

All styling is consistent with the existing UI design system.

## Testing

Run component tests:

```bash
cd auto-claude-ui
npm test BMADBuilderDialog.test.tsx
```

## Validation

Each form includes:
- Required field validation
- Type validation (numbers, strings, etc.)
- Range validation (min/max values)
- Progression validation (e.g., 60-day target > 30-day target)
- Dynamic error messaging

Users cannot proceed to the next category until current validation passes.

## Accessibility

- Keyboard navigation support
- ARIA labels on all form fields
- Focus management
- Error announcement
- Progress indicator

## Browser Support

Tested and working in:
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+
