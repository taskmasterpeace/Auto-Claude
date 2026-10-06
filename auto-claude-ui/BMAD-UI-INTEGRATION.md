# BMAD UI Integration Guide

This document outlines the full integration of the Interactive BMAD Builder into the Electron UI.

## 🎯 Overview

Create a guided wizard UI for building revenue-first specs through categorized questions.

## 📁 Files to Create

### 1. Backend: IPC Handlers
✅ **Created**: `auto-claude-ui/src/main/ipc-handlers/revenue-handlers.ts`
- Handles communication between UI and Python revenue backend
- Methods:
  - `revenue:get-bmad-categories` - Get category structure
  - `revenue:save-category-answers` - Save answers for a category
  - `revenue:generate-bmad-spec` - Compile spec from all answers
  - `revenue:get-status` - Get revenue tracking status
  - `revenue:analyze-business` - Run Stripe analysis
  - `revenue:find-opportunities` - Find competitor opportunities

### 2. Frontend: React Component
**To Create**: `auto-claude-ui/src/renderer/components/BMADBuilderDialog.tsx`

**Structure**:
```tsx
export function BMADBuilderDialog({
  open,
  onOpenChange,
  projectPath
}: BMADBuilderDialogProps) {
  // State management
  const [categories, setCategories] = useState<BMADCategory[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Category components
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        {/* Progress indicator */}
        <CategoryProgress categories={categories} current={currentCategoryIndex} />

        {/* Current category form */}
        {renderCurrentCategory()}

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button onClick={handlePrevious}>Previous</Button>
          <Button onClick={handleNext}>
            {isLastCategory ? 'Generate Spec' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Category Forms to Implement**:

#### Category 1: Revenue Model
- Revenue type (select): Subscription, One-time, Usage-based, Freemium, Add-on
- Current MRR (number input)
- Target revenue (number input)

#### Category 2: Target Market
- Customer segment (select): SMB, Mid-market, Enterprise, Prosumer, Consumer
- Market size (number input)
- Expected conversion rate (number input with % suffix)

#### Category 3: Competitor Analysis
- Competitor URLs (multi-line text input, one per line)
- Average competitor price (number input)
- Key differentiators (textarea)

#### Category 4: Feature Scope
- Feature name (text input)
- Description (textarea)
- Core capabilities (chip input - add/remove capabilities)

#### Category 5: Pricing Strategy
- Price (number input)
- Billing frequency (select): Monthly, Annual, One-time, Usage-based
- Discounts (checkbox + discount details)

#### Category 6: Implementation Plan
- Build approach (select): Build, Library, API, Hybrid
- Estimated effort in days (number input)
- Dependencies (chip input)

#### Category 7: Success Metrics
- Primary metric (select): Revenue, Adoption, Conversion, Retention, Usage
- 7-day target (number input)
- 30-day target (number input)
- 60-day target (number input)

### 3. Shared Types
**To Create**: Add to `auto-claude-ui/src/shared/types/revenue.ts`

```typescript
export interface BMADCategory {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  answers: Record<string, any>;
}

export interface BMADSpec {
  metadata: {
    created_via: string;
    version: string;
  };
  revenue_model: Record<string, any>;
  target_market: Record<string, any>;
  competitors: Record<string, any>;
  features: Record<string, any>;
  pricing: Record<string, any>;
  implementation: Record<string, any>;
  validation: Record<string, any>;
}

export interface RevenueStatus {
  predicted_monthly: number;
  roi_score: number;
  implementation_effort_days: number;
  milestones: RevenueMilestone[];
  feature: string;
  status: string;
}

export interface RevenueMilestone {
  period: string;
  target: number;
  actual: number;
  achieved: boolean;
  progress_pct: number;
}
```

### 4. IPC Constants
**To Add**: `auto-claude-ui/src/shared/constants/ipc.ts`

```typescript
export const REVENUE_CHANNELS = {
  GET_BMAD_CATEGORIES: 'revenue:get-bmad-categories',
  SAVE_CATEGORY_ANSWERS: 'revenue:save-category-answers',
  GENERATE_BMAD_SPEC: 'revenue:generate-bmad-spec',
  GET_STATUS: 'revenue:get-status',
  ANALYZE_BUSINESS: 'revenue:analyze-business',
  FIND_OPPORTUNITIES: 'revenue:find-opportunities',
} as const;
```

### 5. Register Handlers
**To Modify**: `auto-claude-ui/src/main/ipc-handlers/index.ts`

```typescript
import { registerRevenueHandlers } from './revenue-handlers';

export function registerAllHandlers() {
  // ... existing handlers
  registerRevenueHandlers();
}
```

### 6. UI Entry Point
**To Add**: Button in main application to launch BMAD Builder

**Option A**: Add to Project Settings/Actions
```tsx
<Button onClick={() => setIsBMADBuilderOpen(true)}>
  <DollarSign className="w-4 h-4 mr-2" />
  Create Revenue Feature (BMAD)
</Button>

<BMADBuilderDialog
  open={isBMADBuilderOpen}
  onOpenChange={setIsBMADBuilderOpen}
  projectPath={currentProject.path}
  onSpecCreated={(specId) => {
    // Navigate to the new spec
    console.log('BMAD spec created:', specId);
  }}
/>
```

**Option B**: Add to Task Creation Flow
- Add "Revenue Feature" option to task creation
- Opens BMAD builder instead of regular spec creator

## 🎨 UI/UX Design

### Category Progress Indicator
```tsx
<div className="flex items-center justify-between mb-6">
  {categories.map((cat, idx) => (
    <div key={cat.id} className="flex items-center">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center
        ${cat.completed ? 'bg-green-500' : idx === currentIdx ? 'bg-blue-500' : 'bg-gray-300'}
      `}>
        {cat.completed ? <Check size={16} /> : idx + 1}
      </div>
      {idx < categories.length - 1 && (
        <div className="w-12 h-0.5 bg-gray-300" />
      )}
    </div>
  ))}
</div>
```

### Category Card Design
```tsx
<div className="space-y-6">
  <div>
    <h3 className="text-2xl font-bold flex items-center gap-2">
      <DollarSign className="w-6 h-6" />
      {category.name}
    </h3>
    <p className="text-muted-foreground">{category.description}</p>
  </div>

  {/* Form fields */}
  <div className="space-y-4">
    {renderCategoryFields(category)}
  </div>
</div>
```

### Validation
- All required fields must be filled before proceeding
- Show inline validation errors
- Disable "Next" button until category is valid
- Can't generate spec until all categories are complete

## 🔗 Integration with Existing Flow

After BMAD spec is generated:
1. Save spec data to `.auto-claude/bmad_spec.json`
2. Call Python `bmad_integration.py` to create implementation spec
3. Navigate user to the new spec in the UI
4. Show revenue tracking dashboard for the spec

## 📊 Revenue Dashboard (Bonus)

Create a revenue tracking view to show:
- Predicted vs actual revenue
- Milestone progress (7-day, 30-day, 60-day)
- ROI metrics
- Visual progress bars

This can be shown:
- In spec detail view (if BMAD spec)
- As a separate "Revenue" tab in the app
- In project dashboard

## 🚀 Next Steps

1. ✅ Create revenue-handlers.ts
2. ⏳ Create BMADBuilderDialog.tsx component
3. ⏳ Add shared types
4. ⏳ Register handlers in index.ts
5. ⏳ Add UI entry point (button to launch)
6. ⏳ Test end-to-end flow
7. ⏳ Create revenue dashboard view (optional)

## 💡 Alternative: Wizard Library

Consider using a React wizard library for faster development:
- `react-step-wizard` - Simple step-based wizard
- `react-hook-form-wizard` - Integrates with react-hook-form
- Custom Stepper component from shadcn/ui

This would simplify navigation and state management.
