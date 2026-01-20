/**
 * Smoke test - Verify BMAD Builder can be imported and rendered
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BMADBuilderDialog } from '../BMADBuilderDialog';

// Mock window.electronAPI
beforeEach(() => {
  (window as any).electronAPI = {
    revenue: {
      generateBMADSpec: vi.fn().mockResolvedValue({
        success: true,
        data: {
          spec: {},
          tempFile: '/test/spec.json'
        }
      })
    }
  };
});

describe('BMAD Builder Smoke Test', () => {
  it('should render without crashing', () => {
    render(
      <BMADBuilderDialog
        open={true}
        onOpenChange={() => {}}
        projectPath="/test/project"
      />
    );

    expect(screen.getByText('Business Spec Builder')).toBeInTheDocument();
  });

  it('should render first category (Revenue Model)', () => {
    render(
      <BMADBuilderDialog
        open={true}
        onOpenChange={() => {}}
        projectPath="/test/project"
      />
    );

    expect(screen.getByText('Revenue Model')).toBeInTheDocument();
    expect(screen.getByText(/how will this feature generate revenue/i)).toBeInTheDocument();
  });

  it('should render progress indicator', () => {
    render(
      <BMADBuilderDialog
        open={true}
        onOpenChange={() => {}}
        projectPath="/test/project"
      />
    );

    expect(screen.getByText('Step 1 of 7:')).toBeInTheDocument();
  });

  it('should have Previous button disabled on first step', () => {
    render(
      <BMADBuilderDialog
        open={true}
        onOpenChange={() => {}}
        projectPath="/test/project"
      />
    );

    const prevButton = screen.getByRole('button', { name: /previous/i });
    expect(prevButton).toBeDisabled();
  });
});
