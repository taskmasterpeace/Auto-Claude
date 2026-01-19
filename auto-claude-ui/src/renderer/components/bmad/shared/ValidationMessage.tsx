import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ValidationMessageProps {
  message: string;
  variant?: 'error' | 'warning';
}

/**
 * Displays validation error or warning message
 */
export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  message,
  variant = 'error'
}) => {
  return (
    <Alert variant={variant === 'error' ? 'destructive' : 'default'} className="mt-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};
