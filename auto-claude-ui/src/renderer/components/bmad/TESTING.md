# BMAD Builder Testing Guide

## Overview

This guide outlines the testing strategy for the BMAD Builder UI component. Tests should cover unit tests for individual components, integration tests for the dialog workflow, and end-to-end tests for the complete flow.

## Test Structure

```
auto-claude-ui/src/renderer/components/bmad/
├── __tests__/
│   ├── BMADBuilderDialog.test.tsx
│   ├── CategoryProgressIndicator.test.tsx
│   ├── forms/
│   │   ├── RevenueModelForm.test.tsx
│   │   ├── TargetMarketForm.test.tsx
│   │   ├── CompetitorAnalysisForm.test.tsx
│   │   ├── FeatureScopeForm.test.tsx
│   │   ├── PricingStrategyForm.test.tsx
│   │   ├── ImplementationPlanForm.test.tsx
│   │   └── SuccessMetricsForm.test.tsx
│   ├── shared/
│   │   ├── FormField.test.tsx
│   │   ├── CategoryHeader.test.tsx
│   │   └── ValidationMessage.test.tsx
│   └── factories.ts
```

## Test Categories

### 1. Unit Tests - Shared Components

**FormField.test.tsx**
- Renders all input types correctly (text, number, select, textarea, checkbox)
- Displays labels and help text
- Shows validation errors
- Handles onChange events
- Respects disabled state
- Required field indicator displays

**CategoryHeader.test.tsx**
- Renders title and description
- Applies correct styling

**ValidationMessage.test.tsx**
- Renders error messages
- Displays error and warning variants
- Shows icon

### 2. Unit Tests - Form Components

Each form test should verify:

**Validation Logic**
- Required fields validation
- Type validation (numbers, strings)
- Range validation (min/max)
- Custom validation rules
- Error message display

**User Interactions**
- Field changes update state
- Lists can add/remove items
- Dropdowns work correctly
- Dynamic calculations update
- onValidationChange callback fires

**Edge Cases**
- Empty initial state
- Invalid data types
- Boundary values
- Large lists

**Example Test Structure:**

```typescript
describe('RevenueModelForm', () => {
  it('should initialize with default values', () => {
    // Test
  });

  it('should validate required fields', () => {
    // Test
  });

  it('should call onValidationChange when validation state changes', () => {
    // Test
  });

  it('should update answers when fields change', () => {
    // Test
  });

  it('should show error for negative MRR', () => {
    // Test
  });

  it('should calculate revenue summary correctly', () => {
    // Test
  });
});
```

### 3. Unit Tests - CategoryProgressIndicator

**CategoryProgressIndicator.test.tsx**
- Renders all categories
- Highlights current category
- Shows completed categories with checkmarks
- Shows uncompleted categories
- Handles category click events
- Disables non-accessible categories
- Shows progress text
- Renders connector lines with correct colors

### 4. Integration Tests - BMADBuilderDialog

**BMADBuilderDialog.test.tsx**

**Navigation Tests**
- Opens with first category selected
- Next button advances to next category
- Previous button goes to previous category
- Next button disabled when validation fails
- Previous button disabled on first category
- Can click on completed categories to navigate

**State Management**
- Answers persist when navigating between categories
- Category completion status updates correctly
- Validation state updates correctly
- Error messages display and clear appropriately

**Form Integration**
- All 7 forms render correctly
- Forms receive correct props
- Forms update dialog state

**IPC Integration**
- generateBMADSpec called with correct data
- Success handler called on successful generation
- Error handler called on failure
- Loading state displays during generation

**Dialog Lifecycle**
- Resets state when opened
- Closes on successful generation
- Stays open on error
- Cannot close while generating

**Example Test Structure:**

```typescript
describe('BMADBuilderDialog', () => {
  beforeEach(() => {
    // Mock window.electronAPI
    window.electronAPI = {
      revenue: {
        generateBMADSpec: vi.fn()
      }
    } as any;
  });

  it('should start with first category', () => {
    render(<BMADBuilderDialog {...props} />);
    expect(screen.getByText('Revenue Model')).toBeInTheDocument();
  });

  it('should advance to next category when Next clicked', async () => {
    render(<BMADBuilderDialog {...props} />);
    // Fill valid data
    // Click Next
    // Assert next category renders
  });

  it('should block navigation if validation fails', () => {
    // Test
  });

  it('should generate spec on final step', async () => {
    // Test
  });

  it('should handle generation errors', async () => {
    // Test
  });
});
```

### 5. Integration Tests - Full Workflow

**Complete Flow Tests**
- Can complete all 7 categories
- Validation works across all forms
- Spec generates successfully
- Data is correctly formatted

## Test Utilities

### factories.ts

Create test data factories:

```typescript
export const createMockBMADCategory = (
  overrides?: Partial<BMADCategory>
): BMADCategory => ({
  id: 'revenue-model',
  name: 'Revenue Model',
  description: 'Test description',
  completed: false,
  answers: {},
  ...overrides
});

export const createMockRevenueModelAnswers = (
  overrides?: Partial<RevenueModelAnswers>
): RevenueModelAnswers => ({
  revenueType: 'subscription',
  currentMRR: 5000,
  targetRevenue: 10000,
  timeframe: '30-days',
  ...overrides
});

// Add factories for all answer types
```

## Running Tests

### Run all tests
```bash
cd auto-claude-ui
npm test
```

### Run specific test file
```bash
npm test BMADBuilderDialog.test.tsx
```

### Run with coverage
```bash
npm test -- --coverage
```

### Run in watch mode
```bash
npm test -- --watch
```

## Coverage Goals

- **Line Coverage**: 80%+
- **Branch Coverage**: 75%+
- **Function Coverage**: 80%+
- **Statement Coverage**: 80%+

## Manual Testing Checklist

Before marking implementation complete, manually test:

### Navigation
- [ ] Can navigate forward through all categories
- [ ] Can navigate backward through completed categories
- [ ] Cannot skip ahead to incomplete categories
- [ ] Progress indicator updates correctly
- [ ] Current category is highlighted

### Validation
- [ ] Required fields block navigation
- [ ] Error messages display clearly
- [ ] Validation errors clear when fixed
- [ ] Range validation works (min/max)
- [ ] Type validation works (numbers only in number fields)

### Forms
- [ ] All form fields render correctly
- [ ] Dropdowns populate and select correctly
- [ ] Lists can add and remove items
- [ ] Text areas expand appropriately
- [ ] Checkboxes toggle
- [ ] Summary cards calculate correctly

### IPC Integration
- [ ] Spec generates successfully
- [ ] Loading state displays during generation
- [ ] Success callback fires with correct data
- [ ] Error messages display on failure
- [ ] Dialog closes on success

### Edge Cases
- [ ] Works with empty initial data
- [ ] Handles very large numbers
- [ ] Handles very long text
- [ ] Works with special characters
- [ ] Handles rapid clicking (debouncing)

### Accessibility
- [ ] Can navigate with keyboard (Tab)
- [ ] Can submit with Enter key
- [ ] Screen reader compatible
- [ ] Focus visible on all interactive elements
- [ ] Error messages announced

### Visual
- [ ] Responsive design works at different widths
- [ ] No layout shifts during navigation
- [ ] Icons render correctly
- [ ] Colors match design system
- [ ] Spacing is consistent

## Mock Setup

### Mock electronAPI

```typescript
beforeEach(() => {
  window.electronAPI = {
    revenue: {
      getBMADCategories: vi.fn().mockResolvedValue({
        success: true,
        data: mockCategories
      }),
      generateBMADSpec: vi.fn().mockResolvedValue({
        success: true,
        data: {
          spec: mockSpec,
          tempFile: '/path/to/spec.json'
        }
      })
    }
  } as any;
});
```

### Mock React Testing Library

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
```

## Debugging Tests

### Console Logs
```typescript
screen.debug(); // Print entire DOM
screen.debug(element); // Print specific element
```

### Query Debugging
```typescript
screen.getByRole('button', { name: /next/i });
screen.getByLabelText(/revenue type/i);
screen.getByText(/revenue model/i);
```

### Async Debugging
```typescript
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

## Continuous Integration

Tests should run on:
- Every commit (pre-commit hook)
- Every pull request (CI pipeline)
- Before deployment

## Next Steps

1. Implement test files in `__tests__/` directory
2. Set up test coverage reporting
3. Add tests to CI pipeline
4. Document any test-specific configuration
5. Create test utilities and factories
6. Run full test suite
7. Fix any failing tests
8. Achieve coverage goals
