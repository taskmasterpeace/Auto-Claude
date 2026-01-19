import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CategoryFormProps, FeatureScopeAnswers } from '@/shared/types/revenue';
import { CategoryHeader } from '../shared/CategoryHeader';
import { FormField } from '../shared/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Feature Scope Form
 * Defines what exactly is being built and its core capabilities
 */
export const FeatureScopeForm: React.FC<CategoryFormProps<FeatureScopeAnswers>> = ({
  answers,
  onChange,
  onValidationChange,
  disabled = false
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCapability, setNewCapability] = useState('');

  // Initialize with default values if empty
  useEffect(() => {
    if (!answers.featureName) {
      onChange({
        featureName: '',
        description: '',
        capabilities: [],
        coreValue: ''
      });
    }
    // Only run on initial mount to set defaults
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!answers.featureName || answers.featureName.trim() === '') {
      newErrors.featureName = 'Feature name is required';
    }

    if (!answers.description || answers.description.trim() === '') {
      newErrors.description = 'Description is required';
    }

    if (!answers.capabilities || answers.capabilities.length === 0) {
      newErrors.capabilities = 'At least one capability is required';
    }

    if (!answers.coreValue || answers.coreValue.trim() === '') {
      newErrors.coreValue = 'Core value proposition is required';
    }

    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [answers, onValidationChange]);

  const handleFieldChange = (field: keyof FeatureScopeAnswers, value: any) => {
    onChange({
      ...answers,
      [field]: value
    });
  };

  const handleAddCapability = () => {
    if (newCapability.trim()) {
      const updatedCapabilities = [...(answers.capabilities || []), newCapability.trim()];
      handleFieldChange('capabilities', updatedCapabilities);
      setNewCapability('');
    }
  };

  const handleRemoveCapability = (index: number) => {
    const updatedCapabilities = answers.capabilities.filter((_, i) => i !== index);
    handleFieldChange('capabilities', updatedCapabilities);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCapability();
    }
  };

  return (
    <div>
      <CategoryHeader
        title="Feature Scope"
        description="Define what you're building and its core capabilities"
      />

      <div className="space-y-4">
        <FormField
          label="Feature Name"
          name="featureName"
          type="text"
          value={answers.featureName || ''}
          onChange={(value) => handleFieldChange('featureName', value)}
          placeholder="e.g., Advanced Analytics Dashboard"
          required
          disabled={disabled}
          error={errors.featureName}
          helpText="Give your feature a clear, descriptive name"
        />

        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={answers.description || ''}
          onChange={(value) => handleFieldChange('description', value)}
          placeholder="Provide a detailed description of what this feature does and why it's valuable..."
          required
          disabled={disabled}
          error={errors.description}
          helpText="Explain what this feature does and why customers need it"
        />

        {/* Capabilities List */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Key Capabilities
            <span className="text-destructive ml-1">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            What specific capabilities will this feature provide?
          </p>

          {/* Existing capabilities */}
          {answers.capabilities && answers.capabilities.length > 0 && (
            <div className="space-y-2 mb-3">
              {answers.capabilities.map((capability, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="flex-1 text-sm">{capability}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCapability(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new capability */}
          <div className="flex gap-2">
            <Input
              value={newCapability}
              onChange={(e) => setNewCapability(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a capability..."
              disabled={disabled}
            />
            <Button
              onClick={handleAddCapability}
              disabled={!newCapability.trim() || disabled}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {errors.capabilities && (
            <p className="text-xs text-destructive mt-1">{errors.capabilities}</p>
          )}
        </div>

        <FormField
          label="Core Value Proposition"
          name="coreValue"
          type="textarea"
          value={answers.coreValue || ''}
          onChange={(value) => handleFieldChange('coreValue', value)}
          placeholder="In one sentence, what unique value does this feature provide?"
          required
          disabled={disabled}
          error={errors.coreValue}
          helpText="Describe the primary benefit customers get from using this feature"
        />
      </div>

      {/* Summary Card */}
      {answers.featureName && answers.capabilities.length > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">{answers.featureName}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            {answers.description?.substring(0, 150)}
            {answers.description && answers.description.length > 150 && '...'}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{answers.capabilities.length}</span> key capabilities defined
          </p>
        </div>
      )}
    </div>
  );
};
