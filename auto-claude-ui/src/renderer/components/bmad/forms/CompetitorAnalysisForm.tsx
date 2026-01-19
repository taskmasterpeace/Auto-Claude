import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CategoryFormProps, CompetitorAnalysisAnswers } from '@/shared/types/revenue';
import { CategoryHeader } from '../shared/CategoryHeader';
import { FormField } from '../shared/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Simple URL validation helper
 */
const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty URLs are optional
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Competitor Analysis Form
 * Collects information about competitors and their pricing
 */
export const CompetitorAnalysisForm: React.FC<CategoryFormProps<CompetitorAnalysisAnswers>> = ({
  answers,
  onChange,
  onValidationChange,
  disabled = false
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCompetitor, setNewCompetitor] = useState({ name: '', url: '', pricePoint: 0 });
  const [urlError, setUrlError] = useState<string>('');

  // Initialize with default values if empty
  useEffect(() => {
    if (!answers.competitors) {
      onChange({
        competitors: [],
        averageMarketPrice: 0,
        keyDifferentiators: ''
      });
    }
    // Only run on initial mount to set defaults
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!answers.competitors || answers.competitors.length === 0) {
      newErrors.competitors = 'At least one competitor is required';
    }

    if (!answers.averageMarketPrice || answers.averageMarketPrice <= 0) {
      newErrors.averageMarketPrice = 'Average market price must be greater than 0';
    }

    if (!answers.keyDifferentiators || answers.keyDifferentiators.trim() === '') {
      newErrors.keyDifferentiators = 'Key differentiators are required';
    }

    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [answers, onValidationChange]);

  const handleFieldChange = (field: keyof CompetitorAnalysisAnswers, value: any) => {
    onChange({
      ...answers,
      [field]: value
    });
  };

  const handleAddCompetitor = () => {
    // Validate URL if provided
    if (newCompetitor.url && !isValidUrl(newCompetitor.url)) {
      setUrlError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    if (newCompetitor.name.trim() && newCompetitor.pricePoint > 0) {
      const updatedCompetitors = [
        ...(answers.competitors || []),
        { ...newCompetitor, name: newCompetitor.name.trim(), url: newCompetitor.url.trim() }
      ];
      handleFieldChange('competitors', updatedCompetitors);

      // Auto-calculate average price
      const avgPrice = updatedCompetitors.reduce((sum, comp) => sum + comp.pricePoint, 0) / updatedCompetitors.length;
      handleFieldChange('averageMarketPrice', Math.round(avgPrice));

      setNewCompetitor({ name: '', url: '', pricePoint: 0 });
      setUrlError('');
    }
  };

  const handleRemoveCompetitor = (index: number) => {
    const updatedCompetitors = answers.competitors.filter((_, i) => i !== index);
    handleFieldChange('competitors', updatedCompetitors);

    // Recalculate average price
    if (updatedCompetitors.length > 0) {
      const avgPrice = updatedCompetitors.reduce((sum, comp) => sum + comp.pricePoint, 0) / updatedCompetitors.length;
      handleFieldChange('averageMarketPrice', Math.round(avgPrice));
    } else {
      handleFieldChange('averageMarketPrice', 0);
    }
  };

  return (
    <div>
      <CategoryHeader
        title="Competitor Analysis"
        description="Understand your competitive landscape and pricing benchmarks"
      />

      <div className="space-y-4">
        {/* Competitors List */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Competitors
            <span className="text-destructive ml-1">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Add competitors offering similar features
          </p>

          {/* Existing competitors */}
          {answers.competitors && answers.competitors.length > 0 && (
            <div className="space-y-2 mb-3">
              {answers.competitors.map((competitor, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded">
                  <div className="flex-1">
                    <p className="font-medium">{competitor.name}</p>
                    {competitor.url && (
                      <p className="text-xs text-muted-foreground">{competitor.url}</p>
                    )}
                    <p className="text-sm text-green-600 font-semibold mt-1">
                      ${competitor.pricePoint.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCompetitor(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new competitor */}
          <div className="space-y-2 p-4 border rounded-lg">
            <Input
              value={newCompetitor.name}
              onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
              placeholder="Competitor name"
              disabled={disabled}
            />
            <div>
              <Input
                value={newCompetitor.url}
                onChange={(e) => {
                  const url = e.target.value;
                  setNewCompetitor({ ...newCompetitor, url });
                  // Validate URL on change
                  if (url && !isValidUrl(url)) {
                    setUrlError('Invalid URL format');
                  } else {
                    setUrlError('');
                  }
                }}
                placeholder="Website URL (optional)"
                disabled={disabled}
                className={urlError ? 'border-destructive' : ''}
              />
              {urlError && (
                <p className="text-xs text-destructive mt-1">{urlError}</p>
              )}
            </div>
            <Input
              type="number"
              value={newCompetitor.pricePoint || ''}
              onChange={(e) => setNewCompetitor({ ...newCompetitor, pricePoint: Number(e.target.value) })}
              placeholder="Price point ($)"
              disabled={disabled}
              min={1}
            />
            <Button
              onClick={handleAddCompetitor}
              disabled={!newCompetitor.name.trim() || newCompetitor.pricePoint <= 0 || !!urlError || disabled}
              size="sm"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Competitor
            </Button>
          </div>

          {errors.competitors && (
            <p className="text-xs text-destructive mt-1">{errors.competitors}</p>
          )}
        </div>

        <FormField
          label="Average Market Price"
          name="averageMarketPrice"
          type="number"
          value={answers.averageMarketPrice || ''}
          onChange={(value) => handleFieldChange('averageMarketPrice', value)}
          placeholder="99"
          required
          disabled={disabled}
          error={errors.averageMarketPrice}
          helpText="Auto-calculated from competitors or enter manually"
          min={1}
        />

        <FormField
          label="Key Differentiators"
          name="keyDifferentiators"
          type="textarea"
          value={answers.keyDifferentiators || ''}
          onChange={(value) => handleFieldChange('keyDifferentiators', value)}
          placeholder="What makes your feature unique compared to competitors?"
          required
          disabled={disabled}
          error={errors.keyDifferentiators}
          helpText="Describe how your feature stands out from the competition"
        />
      </div>

      {/* Summary Card */}
      {answers.competitors && answers.competitors.length > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Competitive Landscape</h3>
          <p className="text-sm text-muted-foreground">
            Tracking <span className="font-medium">{answers.competitors.length}</span> competitor(s)
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Price range:{' '}
            <span className="font-medium">
              ${Math.min(...answers.competitors.map(c => c.pricePoint)).toLocaleString()} -{' '}
              ${Math.max(...answers.competitors.map(c => c.pricePoint)).toLocaleString()}
            </span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Average price:{' '}
            <span className="font-medium text-green-600">
              ${answers.averageMarketPrice.toLocaleString()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
