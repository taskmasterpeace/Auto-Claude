import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  min?: number;
  max?: number;
  checked?: boolean;
}

/**
 * Reusable form field component that handles different input types
 * Provides consistent styling and validation display
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder,
  helpText,
  error,
  options,
  disabled = false,
  min,
  max,
  checked
}) => {
  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={error ? 'border-destructive' : ''}
            rows={4}
          />
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder={placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={name}
              checked={checked}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <Label
              htmlFor={name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </Label>
          </div>
        );

      case 'number':
        return (
          <Input
            id={name}
            name={name}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={placeholder}
            disabled={disabled}
            className={error ? 'border-destructive' : ''}
            min={min}
            max={max}
          />
        );

      default:
        return (
          <Input
            id={name}
            name={name}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={error ? 'border-destructive' : ''}
          />
        );
    }
  };

  if (type === 'checkbox') {
    return (
      <div className="mb-4">
        {renderInput()}
        {helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <Label htmlFor={name} className="mb-2">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
      {helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};
