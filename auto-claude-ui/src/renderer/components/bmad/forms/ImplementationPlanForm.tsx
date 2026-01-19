import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CategoryFormProps, ImplementationPlanAnswers } from '@/shared/types/revenue';
import { CategoryHeader } from '../shared/CategoryHeader';
import { FormField } from '../shared/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BUILD_APPROACH_OPTIONS = [
  { value: 'mvp', label: 'MVP (Minimum Viable Product)' },
  { value: 'phased', label: 'Phased Rollout' },
  { value: 'full-scope', label: 'Full Scope Implementation' }
];

/**
 * Implementation Plan Form
 * Defines the build approach, effort estimation, and technical requirements
 */
export const ImplementationPlanForm: React.FC<CategoryFormProps<ImplementationPlanAnswers>> = ({
  answers,
  onChange,
  onValidationChange,
  disabled = false
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newDependency, setNewDependency] = useState('');

  // Initialize with default values if empty
  useEffect(() => {
    if (!answers.buildApproach) {
      onChange({
        buildApproach: 'mvp',
        estimatedEffortDays: 0,
        dependencies: [],
        technicalRequirements: ''
      });
    }
  }, []);

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!answers.buildApproach) {
      newErrors.buildApproach = 'Build approach is required';
    }

    if (!answers.estimatedEffortDays || answers.estimatedEffortDays <= 0) {
      newErrors.estimatedEffortDays = 'Effort estimate must be greater than 0';
    }

    if (!answers.technicalRequirements || answers.technicalRequirements.trim() === '') {
      newErrors.technicalRequirements = 'Technical requirements are required';
    }

    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [answers, onValidationChange]);

  const handleFieldChange = (field: keyof ImplementationPlanAnswers, value: any) => {
    onChange({
      ...answers,
      [field]: value
    });
  };

  const handleAddDependency = () => {
    if (newDependency.trim()) {
      const updatedDependencies = [...(answers.dependencies || []), newDependency.trim()];
      handleFieldChange('dependencies', updatedDependencies);
      setNewDependency('');
    }
  };

  const handleRemoveDependency = (index: number) => {
    const updatedDependencies = answers.dependencies.filter((_, i) => i !== index);
    handleFieldChange('dependencies', updatedDependencies);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDependency();
    }
  };

  return (
    <div>
      <CategoryHeader
        title="Implementation Plan"
        description="Define your build strategy and technical requirements"
      />

      <div className="space-y-4">
        <FormField
          label="Build Approach"
          name="buildApproach"
          type="select"
          value={answers.buildApproach || ''}
          onChange={(value) => handleFieldChange('buildApproach', value)}
          options={BUILD_APPROACH_OPTIONS}
          required
          disabled={disabled}
          error={errors.buildApproach}
          helpText="Choose your implementation strategy"
        />

        <FormField
          label="Estimated Effort (Days)"
          name="estimatedEffortDays"
          type="number"
          value={answers.estimatedEffortDays || ''}
          onChange={(value) => handleFieldChange('estimatedEffortDays', value)}
          placeholder="30"
          required
          disabled={disabled}
          error={errors.estimatedEffortDays}
          helpText="How many development days will this feature require?"
          min={1}
        />

        {/* Dependencies List */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Dependencies</label>
          <p className="text-xs text-muted-foreground mb-2">
            List external dependencies, APIs, or services required
          </p>

          {/* Existing dependencies */}
          {answers.dependencies && answers.dependencies.length > 0 && (
            <div className="space-y-2 mb-3">
              {answers.dependencies.map((dependency, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="flex-1 text-sm">{dependency}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDependency(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new dependency */}
          <div className="flex gap-2">
            <Input
              value={newDependency}
              onChange={(e) => setNewDependency(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a dependency..."
              disabled={disabled}
            />
            <Button
              onClick={handleAddDependency}
              disabled={!newDependency.trim() || disabled}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <FormField
          label="Technical Requirements"
          name="technicalRequirements"
          type="textarea"
          value={answers.technicalRequirements || ''}
          onChange={(value) => handleFieldChange('technicalRequirements', value)}
          placeholder="Describe the technical stack, infrastructure needs, and any special requirements..."
          required
          disabled={disabled}
          error={errors.technicalRequirements}
          helpText="Detail the technical components and infrastructure needed"
        />
      </div>

      {/* Summary Card */}
      {answers.estimatedEffortDays > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Implementation Summary</h3>
          <p className="text-sm text-muted-foreground">
            Approach: <span className="font-medium">{answers.buildApproach?.toUpperCase().replace('-', ' ')}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Timeline:{' '}
            <span className="font-medium">
              {answers.estimatedEffortDays} days ({Math.ceil(answers.estimatedEffortDays / 5)} weeks)
            </span>
          </p>
          {answers.dependencies && answers.dependencies.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Dependencies: <span className="font-medium">{answers.dependencies.length}</span> identified
            </p>
          )}
        </div>
      )}
    </div>
  );
};
