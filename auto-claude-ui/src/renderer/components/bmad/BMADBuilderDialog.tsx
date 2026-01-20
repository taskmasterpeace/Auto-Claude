/**
 * BMADBuilderDialog - Interactive wizard for building comprehensive product specs
 *
 * Guides users through 7 categorized question flows to create a complete
 * product specification covering business model, target audience, market
 * positioning, features, pricing, implementation, and success metrics.
 *
 * BMAD = Business Model, Audience, Differentiators (+ Implementation & Metrics)
 *
 * Features:
 * - 7-step wizard with visual progress indicator
 * - Category-specific forms with validation
 * - Previous/Next navigation with validation blocking
 * - IPC integration for spec generation
 * - Works on new projects (no initialization required)
 * - Loading states and error handling
 */

import React, { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
  BMADBuilderDialogProps,
  BMADCategory,
  BMADCategoryId,
  RevenueModelAnswers,
  TargetMarketAnswers,
  CompetitorAnalysisAnswers,
  FeatureScopeAnswers,
  PricingStrategyAnswers,
  ImplementationPlanAnswers,
  SuccessMetricsAnswers
} from '@/shared/types/revenue';
import { CategoryProgressIndicator } from './CategoryProgressIndicator';
import { RevenueModelForm } from './forms/RevenueModelForm';
import { TargetMarketForm } from './forms/TargetMarketForm';
import { CompetitorAnalysisForm } from './forms/CompetitorAnalysisForm';
import { FeatureScopeForm } from './forms/FeatureScopeForm';
import { PricingStrategyForm } from './forms/PricingStrategyForm';
import { ImplementationPlanForm } from './forms/ImplementationPlanForm';
import { SuccessMetricsForm } from './forms/SuccessMetricsForm';

/**
 * Initial empty state for all category answers
 */
const INITIAL_CATEGORIES: BMADCategory[] = [
  {
    id: 'revenue_model',
    name: 'Revenue Model',
    description: 'Define your business model and revenue goals',
    completed: false,
    answers: {}
  },
  {
    id: 'target_market',
    name: 'Target Market',
    description: 'Identify your target audience and market opportunity',
    completed: false,
    answers: {}
  },
  {
    id: 'competitors',
    name: 'Competitor Analysis',
    description: 'Research competitors and market positioning',
    completed: false,
    answers: {}
  },
  {
    id: 'features',
    name: 'Feature Scope',
    description: 'Define what you're building and why',
    completed: false,
    answers: {}
  },
  {
    id: 'pricing',
    name: 'Pricing Strategy',
    description: 'Define your pricing model and value proposition',
    completed: false,
    answers: {}
  },
  {
    id: 'implementation',
    name: 'Implementation Plan',
    description: 'Plan your technical approach and timeline',
    completed: false,
    answers: {}
  },
  {
    id: 'validation',
    name: 'Success Metrics',
    description: 'Define how you'll measure and validate success',
    completed: false,
    answers: {}
  }
];

/**
 * BMAD Builder Dialog Component
 */
export const BMADBuilderDialog: React.FC<BMADBuilderDialogProps> = ({
  open,
  onOpenChange,
  projectPath,
  onSpecGenerated,
  initialData
}) => {
  // State
  const [categories, setCategories] = useState<BMADCategory[]>(INITIAL_CATEGORIES);
  const [currentCategoryId, setCurrentCategoryId] = useState<BMADCategoryId>('revenue_model');
  const [currentCategoryValid, setCurrentCategoryValid] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = categories.findIndex(cat => cat.id === currentCategoryId);
  const currentCategory = categories[currentIndex];
  const isFirstCategory = currentIndex === 0;
  const isLastCategory = currentIndex === categories.length - 1;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCategories(INITIAL_CATEGORIES);
      setCurrentCategoryId('revenue_model');
      setCurrentCategoryValid(false);
      setError(null);
      setIsGenerating(false);
    }
  }, [open]);

  /**
   * Update answers for current category
   */
  const handleAnswersChange = (answers: any) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === currentCategoryId
          ? { ...cat, answers }
          : cat
      )
    );
  };

  /**
   * Handle navigation to previous category
   */
  const handlePrevious = () => {
    if (!isFirstCategory) {
      setCurrentCategoryId(categories[currentIndex - 1].id as BMADCategoryId);
      setError(null);
    }
  };

  /**
   * Handle navigation to next category
   */
  const handleNext = () => {
    if (!currentCategoryValid) {
      setError('Please complete all required fields before continuing');
      return;
    }

    // Mark current category as completed
    setCategories(prev =>
      prev.map(cat =>
        cat.id === currentCategoryId
          ? { ...cat, completed: true }
          : cat
      )
    );

    if (!isLastCategory) {
      setCurrentCategoryId(categories[currentIndex + 1].id as BMADCategoryId);
      setError(null);
    }
  };

  /**
   * Handle spec generation
   */
  const handleGenerateSpec = async () => {
    if (!currentCategoryValid) {
      setError('Please complete all required fields before generating spec');
      return;
    }

    // Mark final category as completed
    const updatedCategories = categories.map(cat =>
      cat.id === currentCategoryId
        ? { ...cat, completed: true }
        : cat
    );

    setIsGenerating(true);
    setError(null);

    try {
      const result = await window.electronAPI.revenue.generateBMADSpec(
        projectPath,
        updatedCategories
      );

      if (result.success && result.data) {
        onSpecGenerated?.(result.data.tempFile, result.data.spec);
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to generate BMAD spec');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate spec. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Navigate to specific category (if completed or current)
   */
  const handleCategoryClick = (categoryId: BMADCategoryId) => {
    const targetIndex = categories.findIndex(cat => cat.id === categoryId);
    const targetCategory = categories[targetIndex];

    // Allow navigation to completed categories or current category
    if (targetCategory.completed || categoryId === currentCategoryId || targetIndex < currentIndex) {
      setCurrentCategoryId(categoryId);
      setError(null);
    }
  };

  /**
   * Render the appropriate form for current category
   */
  const renderCurrentForm = () => {
    switch (currentCategoryId) {
      case 'revenue_model':
        return (
          <RevenueModelForm
            answers={currentCategory.answers as RevenueModelAnswers}
            onChange={handleAnswersChange}
            onValidationChange={setCurrentCategoryValid}
            disabled={isGenerating}
          />
        );

      case 'target_market':
        return (
          <TargetMarketForm
            answers={currentCategory.answers as TargetMarketAnswers}
            onChange={handleAnswersChange}
            onValidationChange={setCurrentCategoryValid}
            disabled={isGenerating}
          />
        );

      case 'competitors':
        return (
          <CompetitorAnalysisForm
            answers={currentCategory.answers as CompetitorAnalysisAnswers}
            onChange={handleAnswersChange}
            onValidationChange={setCurrentCategoryValid}
            disabled={isGenerating}
          />
        );

      case 'features':
        return (
          <FeatureScopeForm
            answers={currentCategory.answers as FeatureScopeAnswers}
            onChange={handleAnswersChange}
            onValidationChange={setCurrentCategoryValid}
            disabled={isGenerating}
          />
        );

      case 'pricing':
        return (
          <PricingStrategyForm
            answers={currentCategory.answers as PricingStrategyAnswers}
            onChange={handleAnswersChange}
            onValidationChange={setCurrentCategoryValid}
            disabled={isGenerating}
          />
        );

      case 'implementation':
        return (
          <ImplementationPlanForm
            answers={currentCategory.answers as ImplementationPlanAnswers}
            onChange={handleAnswersChange}
            onValidationChange={setCurrentCategoryValid}
            disabled={isGenerating}
          />
        );

      case 'validation':
        return (
          <SuccessMetricsForm
            answers={currentCategory.answers as SuccessMetricsAnswers}
            onChange={handleAnswersChange}
            onValidationChange={setCurrentCategoryValid}
            disabled={isGenerating}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <DollarSign className="h-5 w-5" />
            Business Spec Builder
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive product specification covering business model, target audience,
            market positioning, feature scope, pricing, implementation, and success metrics.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <CategoryProgressIndicator
          categories={categories}
          currentCategoryId={currentCategoryId}
          onCategoryClick={handleCategoryClick}
        />

        {/* Form Content */}
        <div className="py-6 min-h-[400px]">
          {renderCurrentForm()}
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Navigation Footer */}
        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstCategory || isGenerating}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {!isLastCategory ? (
              <Button
                onClick={handleNext}
                disabled={!currentCategoryValid || isGenerating}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerateSpec}
                disabled={!currentCategoryValid || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Spec...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Generate Spec
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
