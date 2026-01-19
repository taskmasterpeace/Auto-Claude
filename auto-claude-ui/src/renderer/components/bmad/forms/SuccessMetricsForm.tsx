import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Target } from 'lucide-react';
import { CategoryFormProps, SuccessMetricsAnswers } from '@/shared/types/revenue';
import { CategoryHeader } from '../shared/CategoryHeader';
import { FormField } from '../shared/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PRIMARY_METRIC_OPTIONS = [
  { value: 'revenue', label: 'Revenue (MRR/ARR)' },
  { value: 'users', label: 'Active Users' },
  { value: 'conversion', label: 'Conversion Rate' },
  { value: 'retention', label: 'Retention Rate' },
  { value: 'engagement', label: 'User Engagement' }
];

/**
 * Success Metrics Form
 * Defines how success will be measured with specific targets
 */
export const SuccessMetricsForm: React.FC<CategoryFormProps<SuccessMetricsAnswers>> = ({
  answers,
  onChange,
  onValidationChange,
  disabled = false
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newSecondaryMetric, setNewSecondaryMetric] = useState('');

  // Initialize with default values if empty
  useEffect(() => {
    if (!answers.primaryMetric) {
      onChange({
        primaryMetric: 'revenue',
        sevenDayTarget: 0,
        thirtyDayTarget: 0,
        sixtyDayTarget: 0,
        secondaryMetrics: []
      });
    }
    // Only run on initial mount to set defaults
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!answers.primaryMetric) {
      newErrors.primaryMetric = 'Primary metric is required';
    }

    if (!answers.sevenDayTarget || answers.sevenDayTarget <= 0) {
      newErrors.sevenDayTarget = '7-day target must be greater than 0';
    }

    if (!answers.thirtyDayTarget || answers.thirtyDayTarget <= 0) {
      newErrors.thirtyDayTarget = '30-day target must be greater than 0';
    }

    if (!answers.sixtyDayTarget || answers.sixtyDayTarget <= 0) {
      newErrors.sixtyDayTarget = '60-day target must be greater than 0';
    }

    // Validate target progression (each should be larger than previous)
    if (answers.sevenDayTarget && answers.thirtyDayTarget) {
      if (answers.thirtyDayTarget <= answers.sevenDayTarget) {
        newErrors.thirtyDayTarget = '30-day target should be greater than 7-day target';
      }
    }

    if (answers.thirtyDayTarget && answers.sixtyDayTarget) {
      if (answers.sixtyDayTarget <= answers.thirtyDayTarget) {
        newErrors.sixtyDayTarget = '60-day target should be greater than 30-day target';
      }
    }

    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [answers, onValidationChange]);

  const handleFieldChange = (field: keyof SuccessMetricsAnswers, value: any) => {
    onChange({
      ...answers,
      [field]: value
    });
  };

  const handleAddSecondaryMetric = () => {
    if (newSecondaryMetric.trim()) {
      const updatedMetrics = [...(answers.secondaryMetrics || []), newSecondaryMetric.trim()];
      handleFieldChange('secondaryMetrics', updatedMetrics);
      setNewSecondaryMetric('');
    }
  };

  const handleRemoveSecondaryMetric = (index: number) => {
    const updatedMetrics = answers.secondaryMetrics.filter((_, i) => i !== index);
    handleFieldChange('secondaryMetrics', updatedMetrics);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSecondaryMetric();
    }
  };

  const getMetricUnit = () => {
    switch (answers.primaryMetric) {
      case 'revenue':
        return '$';
      case 'conversion':
      case 'retention':
        return '%';
      case 'users':
      case 'engagement':
        return 'users';
      default:
        return '';
    }
  };

  return (
    <div>
      <CategoryHeader
        title="Success Metrics"
        description="Define how you'll measure success with specific targets"
      />

      <div className="space-y-4">
        <FormField
          label="Primary Success Metric"
          name="primaryMetric"
          type="select"
          value={answers.primaryMetric || ''}
          onChange={(value) => handleFieldChange('primaryMetric', value)}
          options={PRIMARY_METRIC_OPTIONS}
          required
          disabled={disabled}
          error={errors.primaryMetric}
          helpText="The main metric you'll use to measure success"
        />

        {/* Target Timeline */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Target Milestones</h3>
          </div>

          <FormField
            label="7-Day Target"
            name="sevenDayTarget"
            type="number"
            value={answers.sevenDayTarget || ''}
            onChange={(value) => handleFieldChange('sevenDayTarget', value)}
            placeholder="100"
            required
            disabled={disabled}
            error={errors.sevenDayTarget}
            helpText={`Early validation target (${getMetricUnit()})`}
            min={1}
          />

          <FormField
            label="30-Day Target"
            name="thirtyDayTarget"
            type="number"
            value={answers.thirtyDayTarget || ''}
            onChange={(value) => handleFieldChange('thirtyDayTarget', value)}
            placeholder="500"
            required
            disabled={disabled}
            error={errors.thirtyDayTarget}
            helpText={`First month goal (${getMetricUnit()})`}
            min={1}
          />

          <FormField
            label="60-Day Target"
            name="sixtyDayTarget"
            type="number"
            value={answers.sixtyDayTarget || ''}
            onChange={(value) => handleFieldChange('sixtyDayTarget', value)}
            placeholder="1000"
            required
            disabled={disabled}
            error={errors.sixtyDayTarget}
            helpText={`Two month goal (${getMetricUnit()})`}
            min={1}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Secondary Metrics (Optional)</label>
          <p className="text-xs text-muted-foreground mb-2">
            Additional metrics you'll track alongside your primary metric
          </p>

          {/* Existing secondary metrics */}
          {answers.secondaryMetrics && answers.secondaryMetrics.length > 0 && (
            <div className="space-y-2 mb-3">
              {answers.secondaryMetrics.map((metric, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="flex-1 text-sm">{metric}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSecondaryMetric(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new secondary metric */}
          <div className="flex gap-2">
            <Input
              value={newSecondaryMetric}
              onChange={(e) => setNewSecondaryMetric(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a secondary metric..."
              disabled={disabled}
            />
            <Button
              onClick={handleAddSecondaryMetric}
              disabled={!newSecondaryMetric.trim() || disabled}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      {answers.sevenDayTarget > 0 && answers.thirtyDayTarget > 0 && answers.sixtyDayTarget > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Success Tracking</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Primary Metric: <span className="font-medium">{answers.primaryMetric?.replace('-', ' ')}</span>
          </p>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              7 days: <span className="font-medium text-blue-600">{answers.sevenDayTarget.toLocaleString()} {getMetricUnit()}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              30 days: <span className="font-medium text-green-600">{answers.thirtyDayTarget.toLocaleString()} {getMetricUnit()}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              60 days: <span className="font-medium text-purple-600">{answers.sixtyDayTarget.toLocaleString()} {getMetricUnit()}</span>
            </p>
          </div>
          {answers.secondaryMetrics && answers.secondaryMetrics.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              + {answers.secondaryMetrics.length} secondary metric(s)
            </p>
          )}
        </div>
      )}
    </div>
  );
};
