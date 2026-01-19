import React, { useEffect, useState } from 'react';
import { CategoryFormProps, RevenueModelAnswers } from '@/shared/types/revenue';
import { CategoryHeader } from '../shared/CategoryHeader';
import { FormField } from '../shared/FormField';

const REVENUE_TYPE_OPTIONS = [
  { value: 'subscription', label: 'Subscription (Recurring)' },
  { value: 'one-time', label: 'One-Time Purchase' },
  { value: 'usage-based', label: 'Usage-Based Pricing' },
  { value: 'freemium', label: 'Freemium Model' },
  { value: 'enterprise', label: 'Enterprise Licensing' }
];

const TIMEFRAME_OPTIONS = [
  { value: '30-days', label: '30 Days' },
  { value: '60-days', label: '60 Days' },
  { value: '90-days', label: '90 Days' }
];

/**
 * Revenue Model Form
 * Collects information about how the feature will generate revenue
 */
export const RevenueModelForm: React.FC<CategoryFormProps<RevenueModelAnswers>> = ({
  answers,
  onChange,
  onValidationChange,
  disabled = false
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize with default values if empty
  useEffect(() => {
    if (!answers.revenueType) {
      onChange({
        revenueType: 'subscription',
        currentMRR: 0,
        targetRevenue: 0,
        timeframe: '30-days'
      });
    }
    // Only run when answers.revenueType changes from undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.revenueType]);

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!answers.revenueType) {
      newErrors.revenueType = 'Revenue type is required';
    }

    if (answers.currentMRR !== undefined && answers.currentMRR < 0) {
      newErrors.currentMRR = 'Current MRR cannot be negative';
    }

    if (!answers.targetRevenue || answers.targetRevenue <= 0) {
      newErrors.targetRevenue = 'Target revenue must be greater than 0';
    }

    if (!answers.timeframe) {
      newErrors.timeframe = 'Timeframe is required';
    }

    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [answers, onValidationChange]);

  const handleFieldChange = (field: keyof RevenueModelAnswers, value: any) => {
    onChange({
      ...answers,
      [field]: value
    });
  };

  return (
    <div>
      <CategoryHeader
        title="Revenue Model"
        description="Define how this feature will generate revenue for your business"
      />

      <div className="space-y-4">
        <FormField
          label="Revenue Type"
          name="revenueType"
          type="select"
          value={answers.revenueType || ''}
          onChange={(value) => handleFieldChange('revenueType', value)}
          options={REVENUE_TYPE_OPTIONS}
          required
          disabled={disabled}
          error={errors.revenueType}
          helpText="Select the primary revenue model for this feature"
        />

        <FormField
          label="Current Monthly Recurring Revenue (MRR)"
          name="currentMRR"
          type="number"
          value={answers.currentMRR || 0}
          onChange={(value) => handleFieldChange('currentMRR', value)}
          placeholder="0"
          disabled={disabled}
          error={errors.currentMRR}
          helpText="Your current MRR before this feature (enter 0 if starting from scratch)"
          min={0}
        />

        <FormField
          label="Target Revenue Increase"
          name="targetRevenue"
          type="number"
          value={answers.targetRevenue || ''}
          onChange={(value) => handleFieldChange('targetRevenue', value)}
          placeholder="5000"
          required
          disabled={disabled}
          error={errors.targetRevenue}
          helpText="How much additional revenue do you expect from this feature?"
          min={1}
        />

        <FormField
          label="Target Timeframe"
          name="timeframe"
          type="select"
          value={answers.timeframe || ''}
          onChange={(value) => handleFieldChange('timeframe', value)}
          options={TIMEFRAME_OPTIONS}
          required
          disabled={disabled}
          error={errors.timeframe}
          helpText="How quickly do you expect to reach your target revenue?"
        />
      </div>

      {/* Summary Card */}
      {answers.targetRevenue > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Revenue Goal Summary</h3>
          <p className="text-sm text-muted-foreground">
            Increase from <span className="font-medium">${answers.currentMRR?.toLocaleString() || 0} MRR</span> to{' '}
            <span className="font-medium">
              ${((answers.currentMRR || 0) + answers.targetRevenue).toLocaleString()}
            </span>{' '}
            in {answers.timeframe?.replace('-', ' ') || '30 days'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Target increase: <span className="font-medium text-green-600">${answers.targetRevenue.toLocaleString()}</span>
          </p>
        </div>
      )}
    </div>
  );
};
