import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CategoryFormProps, TargetMarketAnswers } from '@/shared/types/revenue';
import { CategoryHeader } from '../shared/CategoryHeader';
import { FormField } from '../shared/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Target Market Form
 * Collects information about the target customer segment and market size
 */
export const TargetMarketForm: React.FC<CategoryFormProps<TargetMarketAnswers>> = ({
  answers,
  onChange,
  onValidationChange,
  disabled = false
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newPainPoint, setNewPainPoint] = useState('');

  // Initialize with default values if empty
  useEffect(() => {
    if (!answers.customerSegment) {
      onChange({
        customerSegment: '',
        marketSize: 0,
        expectedConversionRate: 0,
        customerPainPoints: []
      });
    }
    // Only run when answers.customerSegment changes from undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.customerSegment]);

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!answers.customerSegment || answers.customerSegment.trim() === '') {
      newErrors.customerSegment = 'Customer segment is required';
    }

    if (!answers.marketSize || answers.marketSize <= 0) {
      newErrors.marketSize = 'Market size must be greater than 0';
    }

    if (answers.expectedConversionRate !== undefined) {
      if (answers.expectedConversionRate < 0 || answers.expectedConversionRate > 100) {
        newErrors.expectedConversionRate = 'Conversion rate must be between 0 and 100';
      }
    }

    if (!answers.customerPainPoints || answers.customerPainPoints.length === 0) {
      newErrors.customerPainPoints = 'At least one pain point is required';
    }

    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [answers, onValidationChange]);

  const handleFieldChange = (field: keyof TargetMarketAnswers, value: any) => {
    onChange({
      ...answers,
      [field]: value
    });
  };

  const handleAddPainPoint = () => {
    if (newPainPoint.trim()) {
      const updatedPainPoints = [...(answers.customerPainPoints || []), newPainPoint.trim()];
      handleFieldChange('customerPainPoints', updatedPainPoints);
      setNewPainPoint('');
    }
  };

  const handleRemovePainPoint = (index: number) => {
    const updatedPainPoints = answers.customerPainPoints.filter((_, i) => i !== index);
    handleFieldChange('customerPainPoints', updatedPainPoints);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPainPoint();
    }
  };

  return (
    <div>
      <CategoryHeader
        title="Target Market"
        description="Identify your target customer segment and understand their needs"
      />

      <div className="space-y-4">
        <FormField
          label="Customer Segment"
          name="customerSegment"
          type="text"
          value={answers.customerSegment || ''}
          onChange={(value) => handleFieldChange('customerSegment', value)}
          placeholder="e.g., B2B SaaS companies with 10-50 employees"
          required
          disabled={disabled}
          error={errors.customerSegment}
          helpText="Describe who will pay for this feature"
        />

        <FormField
          label="Total Addressable Market (TAM)"
          name="marketSize"
          type="number"
          value={answers.marketSize || ''}
          onChange={(value) => handleFieldChange('marketSize', value)}
          placeholder="10000"
          required
          disabled={disabled}
          error={errors.marketSize}
          helpText="Estimated number of potential customers in your target market"
          min={1}
        />

        <FormField
          label="Expected Conversion Rate (%)"
          name="expectedConversionRate"
          type="number"
          value={answers.expectedConversionRate || ''}
          onChange={(value) => handleFieldChange('expectedConversionRate', value)}
          placeholder="2.5"
          disabled={disabled}
          error={errors.expectedConversionRate}
          helpText="What percentage of your target market do you expect to convert?"
          min={0}
          max={100}
        />

        {/* Customer Pain Points List */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Customer Pain Points
            <span className="text-destructive ml-1">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            What problems does your feature solve for customers?
          </p>

          {/* Existing pain points */}
          {answers.customerPainPoints && answers.customerPainPoints.length > 0 && (
            <div className="space-y-2 mb-3">
              {answers.customerPainPoints.map((painPoint, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="flex-1 text-sm">{painPoint}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePainPoint(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new pain point */}
          <div className="flex gap-2">
            <Input
              value={newPainPoint}
              onChange={(e) => setNewPainPoint(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a customer pain point..."
              disabled={disabled}
            />
            <Button
              onClick={handleAddPainPoint}
              disabled={!newPainPoint.trim() || disabled}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {errors.customerPainPoints && (
            <p className="text-xs text-destructive mt-1">{errors.customerPainPoints}</p>
          )}
        </div>
      </div>

      {/* Summary Card */}
      {answers.marketSize > 0 && answers.expectedConversionRate > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Market Opportunity</h3>
          <p className="text-sm text-muted-foreground">
            With a TAM of <span className="font-medium">{answers.marketSize.toLocaleString()}</span> and{' '}
            <span className="font-medium">{answers.expectedConversionRate}%</span> conversion rate:
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Potential customers:{' '}
            <span className="font-medium text-green-600">
              {Math.round((answers.marketSize * answers.expectedConversionRate) / 100).toLocaleString()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
