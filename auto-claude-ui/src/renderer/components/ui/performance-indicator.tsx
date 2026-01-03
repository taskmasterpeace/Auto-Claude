import { cn } from '../../lib/utils';

interface PerformanceIndicatorProps {
  label: string;
  value: number; // 1-5
  compact?: boolean;
}

export function PerformanceIndicator({ label, value, compact = false }: PerformanceIndicatorProps) {
  const dots = Array.from({ length: 5 }, (_, i) => i < value);

  // Color based on value: green (high) to red (low)
  const getColor = (index: number) => {
    if (!dots[index]) return 'bg-muted';
    if (value >= 4) return 'bg-green-500';
    if (value >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={cn('flex items-center gap-1.5', compact && 'text-xs')}>
      {!compact && <span className="text-xs text-muted-foreground min-w-[50px]">{label}:</span>}
      <div className="flex gap-0.5">
        {dots.map((filled, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full',
              compact ? 'h-1.5 w-1.5' : 'h-2 w-2',
              getColor(i)
            )}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
