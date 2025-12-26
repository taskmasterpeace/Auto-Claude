import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { RecordingState } from '../../../shared/types/speech';

const recordButtonVariants = cva(
  'inline-flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      state: {
        idle: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
        recording:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse',
        error:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-10 w-10',
        sm: 'h-8 w-8',
        lg: 'h-12 w-12',
      },
    },
    defaultVariants: {
      state: 'idle',
      size: 'default',
    },
  }
);

export interface RecordButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof recordButtonVariants> {
  /** Current recording state */
  recordingState?: RecordingState;
  /** Callback when recording toggle is requested */
  onToggleRecording?: () => void;
  /** Error message to show in tooltip/aria-label when in error state */
  errorMessage?: string;
}

const RecordButton = React.forwardRef<HTMLButtonElement, RecordButtonProps>(
  (
    {
      className,
      recordingState = 'idle',
      size,
      onToggleRecording,
      errorMessage,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onToggleRecording?.();
      onClick?.(e);
    };

    const getAriaLabel = (): string => {
      switch (recordingState) {
        case 'recording':
          return 'Stop recording';
        case 'error':
          return errorMessage || 'Recording error. Click to retry.';
        default:
          return 'Start recording';
      }
    };

    const getIcon = () => {
      const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

      switch (recordingState) {
        case 'recording':
          return <MicOff size={iconSize} aria-hidden="true" />;
        case 'error':
          return <AlertCircle size={iconSize} aria-hidden="true" />;
        default:
          return <Mic size={iconSize} aria-hidden="true" />;
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          recordButtonVariants({ state: recordingState, size, className })
        )}
        onClick={handleClick}
        aria-label={getAriaLabel()}
        aria-pressed={recordingState === 'recording'}
        title={recordingState === 'error' ? errorMessage : undefined}
        {...props}
      >
        {getIcon()}
      </button>
    );
  }
);
RecordButton.displayName = 'RecordButton';

export { RecordButton, recordButtonVariants };
