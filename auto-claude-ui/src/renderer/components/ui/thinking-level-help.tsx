import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { PerformanceIndicator } from './performance-indicator';
import { THINKING_LEVEL_HELP } from '../../../shared/constants/thinking-help';
import type { ThinkingLevel } from '../../../shared/types';
import { cn } from '../../lib/utils';

interface ThinkingLevelHelpProps {
  mode: 'inline' | 'item';
  level?: ThinkingLevel;
  children?: React.ReactNode;
  className?: string;
}

export function ThinkingLevelHelp({ mode, level, children, className }: ThinkingLevelHelpProps) {
  if (mode === 'inline') {
    // Info icon with general thinking levels explanation
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={cn('h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help', className)} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm font-medium">About Thinking Levels</p>
            <p className="text-xs text-muted-foreground">
              Thinking levels control how deeply Claude analyzes your task. Higher levels provide better quality but cost more and take longer.
            </p>
            <div className="pt-2 border-t space-y-1">
              <p className="text-xs font-medium">Quick Guide:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li><strong>Low:</strong> Standard tasks</li>
                <li><strong>Medium:</strong> Most features</li>
                <li><strong>High:</strong> Complex features</li>
                <li><strong>Ultrathink:</strong> Critical features</li>
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (mode === 'item' && level) {
    // Individual item tooltip for dropdown options
    const info = THINKING_LEVEL_HELP[level];

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {children || <span>{info.label}</span>}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm" side="right">
          <div className="space-y-3">
            {/* Header */}
            <div>
              <p className="text-sm font-medium">{info.label} Thinking</p>
              <p className="text-xs text-muted-foreground">
                {info.tokens ? `${info.tokens.toLocaleString()} tokens` : 'No thinking budget'}
              </p>
            </div>

            {/* Performance Indicators */}
            <div className="space-y-1 py-2 border-y">
              <PerformanceIndicator label="Speed" value={info.performance.speed} />
              <PerformanceIndicator label="Cost" value={info.performance.cost} />
              <PerformanceIndicator label="Quality" value={info.performance.quality} />
            </div>

            {/* Use Cases */}
            <div>
              <p className="text-xs font-medium mb-1">Best For:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                {info.bestFor.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}
