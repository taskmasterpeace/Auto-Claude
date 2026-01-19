import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CategoryFormProps, PricingStrategyAnswers } from '@/shared/types/revenue';
import { CategoryHeader } from '../shared/CategoryHeader';
import { FormField } from '../shared/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const BILLING_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'one-time', label: 'One-Time' },
  { value: 'usage', label: 'Usage-Based' }
];

/**
 * Pricing Strategy Form
 * Defines pricing structure and discount strategies
 */
export const PricingStrategyForm: React.FC<CategoryFormProps<PricingStrategyAnswers>> = ({
  answers,
  onChange,
  onValidationChange,
  disabled = false
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTier, setNewTier] = useState({ name: '', price: 0, features: '' });

  // Initialize with default values if empty
  useEffect(() => {
    if (!answers.pricePoint) {
      onChange({
        pricePoint: 0,
        billingFrequency: 'monthly',
        discounts: {
          annual: false,
          volume: false,
          enterprise: false
        },
        pricingTiers: []
      });
    }
    // Only run on initial mount to set defaults
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!answers.pricePoint || answers.pricePoint <= 0) {
      newErrors.pricePoint = 'Price point must be greater than 0';
    }

    if (!answers.billingFrequency) {
      newErrors.billingFrequency = 'Billing frequency is required';
    }

    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [answers, onValidationChange]);

  const handleFieldChange = (field: keyof PricingStrategyAnswers, value: any) => {
    onChange({
      ...answers,
      [field]: value
    });
  };

  const handleDiscountChange = (discountType: 'annual' | 'volume' | 'enterprise', checked: boolean) => {
    handleFieldChange('discounts', {
      ...answers.discounts,
      [discountType]: checked
    });
  };

  const handleAddTier = () => {
    if (newTier.name.trim() && newTier.price > 0) {
      const updatedTiers = [
        ...(answers.pricingTiers || []),
        {
          name: newTier.name.trim(),
          price: newTier.price,
          features: newTier.features.split(',').map(f => f.trim()).filter(f => f)
        }
      ];
      handleFieldChange('pricingTiers', updatedTiers);
      setNewTier({ name: '', price: 0, features: '' });
    }
  };

  const handleRemoveTier = (index: number) => {
    const updatedTiers = answers.pricingTiers.filter((_, i) => i !== index);
    handleFieldChange('pricingTiers', updatedTiers);
  };

  return (
    <div>
      <CategoryHeader
        title="Pricing Strategy"
        description="Define your pricing structure and discount strategies"
      />

      <div className="space-y-4">
        <FormField
          label="Base Price Point"
          name="pricePoint"
          type="number"
          value={answers.pricePoint || ''}
          onChange={(value) => handleFieldChange('pricePoint', value)}
          placeholder="99"
          required
          disabled={disabled}
          error={errors.pricePoint}
          helpText="The primary price for your feature (per billing cycle)"
          min={1}
        />

        <FormField
          label="Billing Frequency"
          name="billingFrequency"
          type="select"
          value={answers.billingFrequency || ''}
          onChange={(value) => handleFieldChange('billingFrequency', value)}
          options={BILLING_FREQUENCY_OPTIONS}
          required
          disabled={disabled}
          error={errors.billingFrequency}
          helpText="How often will customers be billed?"
        />

        {/* Discount Options */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Discount Strategies</label>
          <p className="text-xs text-muted-foreground">
            Select which discount types you'll offer
          </p>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="annual-discount"
                checked={answers.discounts?.annual || false}
                onCheckedChange={(checked) => handleDiscountChange('annual', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="annual-discount" className="text-sm cursor-pointer">
                Annual discount (typically 15-20% off)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="volume-discount"
                checked={answers.discounts?.volume || false}
                onCheckedChange={(checked) => handleDiscountChange('volume', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="volume-discount" className="text-sm cursor-pointer">
                Volume discount (for larger teams/usage)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enterprise-discount"
                checked={answers.discounts?.enterprise || false}
                onCheckedChange={(checked) => handleDiscountChange('enterprise', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="enterprise-discount" className="text-sm cursor-pointer">
                Enterprise discount (custom pricing)
              </Label>
            </div>
          </div>
        </div>

        {/* Pricing Tiers (Optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Pricing Tiers (Optional)</label>
          <p className="text-xs text-muted-foreground mb-2">
            Add multiple pricing tiers if you have a tiered pricing model
          </p>

          {/* Existing tiers */}
          {answers.pricingTiers && answers.pricingTiers.length > 0 && (
            <div className="space-y-2 mb-3">
              {answers.pricingTiers.map((tier, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded">
                  <div className="flex-1">
                    <p className="font-medium">{tier.name}</p>
                    <p className="text-sm text-green-600 font-semibold">
                      ${tier.price.toLocaleString()}/{answers.billingFrequency}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tier.features.length} features
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTier(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new tier */}
          <div className="space-y-2 p-4 border rounded-lg">
            <Input
              value={newTier.name}
              onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
              placeholder="Tier name (e.g., Starter, Pro, Enterprise)"
              disabled={disabled}
            />
            <Input
              type="number"
              value={newTier.price || ''}
              onChange={(e) => setNewTier({ ...newTier, price: Number(e.target.value) })}
              placeholder="Price"
              disabled={disabled}
              min={1}
            />
            <Input
              value={newTier.features}
              onChange={(e) => setNewTier({ ...newTier, features: e.target.value })}
              placeholder="Features (comma-separated)"
              disabled={disabled}
            />
            <Button
              onClick={handleAddTier}
              disabled={!newTier.name.trim() || newTier.price <= 0 || disabled}
              size="sm"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Tier
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      {answers.pricePoint > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Pricing Summary</h3>
          <p className="text-sm text-muted-foreground">
            Base price:{' '}
            <span className="font-medium text-green-600">
              ${answers.pricePoint.toLocaleString()}/{answers.billingFrequency}
            </span>
          </p>
          {answers.pricingTiers && answers.pricingTiers.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {answers.pricingTiers.length} pricing tier(s) configured
            </p>
          )}
          {(answers.discounts?.annual || answers.discounts?.volume || answers.discounts?.enterprise) && (
            <p className="text-sm text-muted-foreground mt-1">
              Discounts: {[
                answers.discounts.annual && 'Annual',
                answers.discounts.volume && 'Volume',
                answers.discounts.enterprise && 'Enterprise'
              ].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
