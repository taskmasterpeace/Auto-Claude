/**
 * Task Reflection Card component
 *
 * Displays detailed post-task reflection data including:
 * - Success/failure status
 * - QA iterations
 * - Issues found with file locations
 * - What worked/failed
 * - Recommendations
 */

import React, { useState } from 'react';
import type { TaskReflection } from '../../../shared/types';
import { cn } from '../../lib/utils';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  FileCode,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  RotateCw,
  Timer,
  Wrench,
} from 'lucide-react';

interface TaskReflectionCardProps {
  reflection: TaskReflection;
}

export const TaskReflectionCard: React.FC<TaskReflectionCardProps> = ({ reflection }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const getQAIterationColor = (iterations: number): string => {
    if (iterations <= 1) return 'text-green-600';
    if (iterations <= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQAIterationBg = (iterations: number): string => {
    if (iterations <= 1) return 'bg-green-500/10';
    if (iterations <= 2) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors',
        reflection.success
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-red-500/30 bg-red-500/5'
      )}
    >
      {/* Header - always visible */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status icon */}
        <div
          className={cn(
            'p-2 rounded-lg',
            reflection.success ? 'bg-green-500/10' : 'bg-red-500/10'
          )}
        >
          {reflection.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{reflection.spec_id}</h4>
            <span
              className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                reflection.success ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'
              )}
            >
              {reflection.success ? 'Success' : 'Failed'}
            </span>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <RotateCw className="w-3.5 h-3.5" />
              <span className={getQAIterationColor(reflection.qa_iterations)}>
                {reflection.qa_iterations} QA iteration{reflection.qa_iterations !== 1 ? 's' : ''}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              {formatDuration(reflection.total_duration_seconds)}
            </span>
            {reflection.issues_found.length > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                {reflection.issues_found.length} issue{reflection.issues_found.length !== 1 ? 's' : ''} found
              </span>
            )}
          </div>

          {/* Issue type badges */}
          {reflection.issue_types.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {reflection.issue_types.slice(0, 4).map((issueType, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-muted rounded-full"
                >
                  {issueType.replace(/_/g, ' ')}
                </span>
              ))}
              {reflection.issue_types.length > 4 && (
                <span className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground">
                  +{reflection.issue_types.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand/collapse */}
        <div className="flex items-center">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t pt-4 space-y-4">
          {/* Phase durations */}
          {Object.keys(reflection.phase_durations).length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Phase Durations
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(reflection.phase_durations).map(([phase, duration]) => (
                  <div
                    key={phase}
                    className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm"
                  >
                    <span className="text-muted-foreground capitalize">
                      {phase.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{formatDuration(duration as number)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues found with file locations */}
          {reflection.issues_found.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                Issues Found ({reflection.issues_found.length})
              </h5>
              <div className="space-y-2">
                {reflection.issues_found.map((issue, i) => (
                  <div
                    key={i}
                    className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          issue.type === 'type_error' && 'bg-red-500/10 text-red-600',
                          issue.type === 'runtime_error' && 'bg-red-500/10 text-red-600',
                          issue.type === 'test_failure' && 'bg-orange-500/10 text-orange-600',
                          issue.type === 'lint_error' && 'bg-yellow-500/10 text-yellow-600',
                          issue.type === 'missing_feature' && 'bg-blue-500/10 text-blue-600',
                          !['type_error', 'runtime_error', 'test_failure', 'lint_error', 'missing_feature'].includes(issue.type) &&
                            'bg-muted text-muted-foreground'
                        )}
                      >
                        {issue.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm mt-2">{issue.description}</p>
                    {issue.section && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <FileCode className="w-3.5 h-3.5" />
                        <code className="font-mono bg-muted px-1.5 py-0.5 rounded">
                          {issue.section}
                        </code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixes applied */}
          {reflection.fixes_applied.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-green-600" />
                Fixes Applied ({reflection.fixes_applied.length})
              </h5>
              <div className="space-y-2">
                {reflection.fixes_applied.map((fix, i) => (
                  <div key={i} className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <p className="text-sm font-medium">{fix.title}</p>
                    {fix.details.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {fix.details.map((detail, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">-</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What worked */}
          {reflection.what_worked.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                What Worked
              </h5>
              <ul className="space-y-1.5">
                {reflection.what_worked.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What failed */}
          {reflection.what_failed.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ThumbsDown className="w-4 h-4 text-red-600" />
                What Failed
              </h5>
              <ul className="space-y-1.5">
                {reflection.what_failed.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {reflection.recommendations.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                Recommendations for Future Tasks
              </h5>
              <ul className="space-y-1.5">
                {reflection.recommendations.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-yellow-500 mt-0.5">*</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Completed: {new Date(reflection.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskReflectionCard;
