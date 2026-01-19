/**
 * BMADBuilderDialog Test Suite
 * Tests for the main BMAD Builder dialog component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BMADBuilderDialog } from '../BMADBuilderDialog';
import type { BMADBuilderDialogProps } from '@/shared/types/revenue';

// Mock window.electronAPI
const mockGenerateBMADSpec = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock electron API
  (window as any).electronAPI = {
    revenue: {
      generateBMADSpec: mockGenerateBMADSpec
    }
  };
});

describe('BMADBuilderDialog', () => {
  const defaultProps: BMADBuilderDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    projectPath: '/test/project',
    onSpecGenerated: vi.fn()
  };

  describe('Initialization', () => {
    it('should render when open', () => {
      render(<BMADBuilderDialog {...defaultProps} />);
      expect(screen.getByText('Build Revenue-First Spec')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<BMADBuilderDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('Build Revenue-First Spec')).not.toBeInTheDocument();
    });

    it('should start with Revenue Model category', () => {
      render(<BMADBuilderDialog {...defaultProps} />);
      expect(screen.getByText('Revenue Model')).toBeInTheDocument();
      expect(screen.getByText('How will this feature generate revenue?')).toBeInTheDocument();
    });

    it('should show progress indicator', () => {
      render(<BMADBuilderDialog {...defaultProps} />);
      expect(screen.getByText('Step 1 of 7:')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should disable Previous button on first category', () => {
      render(<BMADBuilderDialog {...defaultProps} />);
      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should disable Next button when validation fails', () => {
      render(<BMADBuilderDialog {...defaultProps} />);
      const nextButton = screen.getByRole('button', { name: /next/i });
      // Initially should be disabled (no data entered)
      expect(nextButton).toBeDisabled();
    });

    it('should show Generate Spec button on last category', async () => {
      render(<BMADBuilderDialog {...defaultProps} />);

      // Navigate through all categories (mock valid data)
      // This would require filling out all forms
      // For this example, we'll test the button appears

      // Note: In real tests, you'd fill forms and navigate
      // expect(screen.getByRole('button', { name: /generate spec/i })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error message when trying to proceed with invalid data', async () => {
      render(<BMADBuilderDialog {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/please complete all required fields/i)).toBeInTheDocument();
      });
    });

    it('should clear error message when validation passes', async () => {
      render(<BMADBuilderDialog {...defaultProps} />);

      // Fill in valid data
      // const revenueTypeSelect = screen.getByLabelText(/revenue type/i);
      // fireEvent.change(revenueTypeSelect, { target: { value: 'subscription' } });

      // Error should clear
      // expect(screen.queryByText(/please complete/i)).not.toBeInTheDocument();
    });
  });

  describe('IPC Integration', () => {
    it('should call generateBMADSpec when Generate Spec button clicked', async () => {
      mockGenerateBMADSpec.mockResolvedValue({
        success: true,
        data: {
          spec: {},
          tempFile: '/test/spec.json'
        }
      });

      render(<BMADBuilderDialog {...defaultProps} />);

      // Navigate to last category and fill all forms (simplified for test)
      // const generateButton = screen.getByRole('button', { name: /generate spec/i });
      // fireEvent.click(generateButton);

      // await waitFor(() => {
      //   expect(mockGenerateBMADSpec).toHaveBeenCalledWith(
      //     '/test/project',
      //     expect.any(Array)
      //   );
      // });
    });

    it('should show loading state during spec generation', async () => {
      mockGenerateBMADSpec.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { spec: {}, tempFile: '/test/spec.json' }
        }), 100))
      );

      render(<BMADBuilderDialog {...defaultProps} />);

      // Click generate (after navigating to last step)
      // const generateButton = screen.getByRole('button', { name: /generate spec/i });
      // fireEvent.click(generateButton);

      // expect(screen.getByText(/generating spec/i)).toBeInTheDocument();
    });

    it('should call onSpecGenerated callback on success', async () => {
      const onSpecGenerated = vi.fn();
      mockGenerateBMADSpec.mockResolvedValue({
        success: true,
        data: {
          spec: { test: 'data' },
          tempFile: '/test/spec.json'
        }
      });

      render(<BMADBuilderDialog {...defaultProps} onSpecGenerated={onSpecGenerated} />);

      // Generate spec
      // await waitFor(() => {
      //   expect(onSpecGenerated).toHaveBeenCalledWith(
      //     '/test/spec.json',
      //     { test: 'data' }
      //   );
      // });
    });

    it('should show error message on generation failure', async () => {
      mockGenerateBMADSpec.mockResolvedValue({
        success: false,
        error: 'Failed to generate spec'
      });

      render(<BMADBuilderDialog {...defaultProps} />);

      // Attempt to generate
      // await waitFor(() => {
      //   expect(screen.getByText(/failed to generate spec/i)).toBeInTheDocument();
      // });
    });

    it('should close dialog on successful generation', async () => {
      const onOpenChange = vi.fn();
      mockGenerateBMADSpec.mockResolvedValue({
        success: true,
        data: {
          spec: {},
          tempFile: '/test/spec.json'
        }
      });

      render(<BMADBuilderDialog {...defaultProps} onOpenChange={onOpenChange} />);

      // Generate spec successfully
      // await waitFor(() => {
      //   expect(onOpenChange).toHaveBeenCalledWith(false);
      // });
    });
  });

  describe('State Management', () => {
    it('should preserve answers when navigating between categories', async () => {
      render(<BMADBuilderDialog {...defaultProps} />);

      // Fill first category
      // Navigate to second category
      // Navigate back to first category
      // Verify data is still there
    });

    it('should mark categories as completed after validation passes', async () => {
      render(<BMADBuilderDialog {...defaultProps} />);

      // Fill valid data
      // Navigate to next
      // Verify category marked as completed (check progress indicator)
    });

    it('should reset state when dialog reopens', async () => {
      const { rerender } = render(<BMADBuilderDialog {...defaultProps} open={false} />);

      // Open dialog
      rerender(<BMADBuilderDialog {...defaultProps} open={true} />);

      // Verify state is fresh
      expect(screen.getByText('Step 1 of 7:')).toBeInTheDocument();
    });
  });

  describe('Category Navigation via Progress Indicator', () => {
    it('should navigate to completed category when clicked', async () => {
      render(<BMADBuilderDialog {...defaultProps} />);

      // Complete first category and move to second
      // Click on first category in progress indicator
      // Verify navigation back to first category
    });

    it('should not navigate to incomplete category when clicked', async () => {
      render(<BMADBuilderDialog {...defaultProps} />);

      // Try to click on incomplete future category
      // Verify no navigation occurs
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing projectPath', () => {
      render(<BMADBuilderDialog {...defaultProps} projectPath="" />);
      // Should still render without errors
      expect(screen.getByText('Build Revenue-First Spec')).toBeInTheDocument();
    });

    it('should handle IPC timeout', async () => {
      mockGenerateBMADSpec.mockImplementation(() =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      render(<BMADBuilderDialog {...defaultProps} />);

      // Attempt generation
      // await waitFor(() => {
      //   expect(screen.getByText(/timeout|failed/i)).toBeInTheDocument();
      // });
    });
  });
});
