/**
 * Metrics Dashboard component
 *
 * Displays aggregated improvement metrics in a dashboard format.
 */

import React from 'react';
import type { ImprovementMetrics } from '../../../shared/types';
import { cn } from '../../lib/utils';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Target,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface MetricsDashboardProps {
  metrics: ImprovementMetrics;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ metrics }) => {
  const successRate =
    metrics.total_tasks > 0 ? (metrics.successful_tasks / metrics.total_tasks) * 100 : 0;

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Metrics Dashboard
      </h3>

      {/* Main metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Task success rate */}
        <MetricCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Success Rate"
          value={`${successRate.toFixed(0)}%`}
          subtext={`${metrics.successful_tasks}/${metrics.total_tasks} tasks`}
          color={successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red'}
        />

        {/* Average QA iterations */}
        <MetricCard
          icon={<RefreshCw className="w-5 h-5" />}
          label="Avg QA Iterations"
          value={metrics.avg_qa_iterations.toFixed(1)}
          subtext={`${metrics.total_qa_iterations} total`}
          color={metrics.avg_qa_iterations <= 2 ? 'green' : metrics.avg_qa_iterations <= 3 ? 'yellow' : 'red'}
        />

        {/* Average task duration */}
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Duration"
          value={formatDuration(metrics.avg_task_duration_seconds)}
          subtext="per task"
          color="blue"
        />

        {/* Recurring patterns */}
        <MetricCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Patterns Found"
          value={metrics.recurring_patterns_count.toString()}
          subtext={`${metrics.patterns_fixed} fixed`}
          color={metrics.recurring_patterns_count === 0 ? 'green' : 'yellow'}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Cards stats */}
        <MetricCard
          icon={<Lightbulb className="w-5 h-5" />}
          label="Cards Proposed"
          value={metrics.cards_proposed.toString()}
          subtext={`${metrics.cards_approved} approved, ${metrics.cards_applied} applied`}
          color="purple"
          small
        />

        {/* Goals stats */}
        <MetricCard
          icon={<Target className="w-5 h-5" />}
          label="Goals"
          value={`${metrics.active_goals} active`}
          subtext={`${metrics.achieved_goals} achieved`}
          color="blue"
          small
        />

        {/* Phase durations */}
        {metrics.avg_planning_duration > 0 && (
          <div className="p-3 bg-muted rounded-lg col-span-2">
            <span className="text-xs text-muted-foreground">Avg Phase Durations</span>
            <div className="flex gap-4 mt-1 text-sm">
              <span>
                Planning: <strong>{formatDuration(metrics.avg_planning_duration)}</strong>
              </span>
              <span>
                Coding: <strong>{formatDuration(metrics.avg_coding_duration)}</strong>
              </span>
              <span>
                Validation: <strong>{formatDuration(metrics.avg_validation_duration)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progress bars */}
      {metrics.total_tasks > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-20 text-muted-foreground">Task Success</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${successRate}%` }}
              />
            </div>
            <span className="w-12 text-right">{successRate.toFixed(0)}%</span>
          </div>

          {metrics.cards_proposed > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 text-muted-foreground">Cards Applied</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${(metrics.cards_applied / metrics.cards_proposed) * 100}%`,
                  }}
                />
              </div>
              <span className="w-12 text-right">
                {metrics.cards_applied}/{metrics.cards_proposed}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
  small?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  subtext,
  color,
  small = false,
}) => {
  const colorClasses = {
    green: 'text-green-500 bg-green-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
    red: 'text-red-500 bg-red-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  };

  return (
    <div className={cn('p-3 border rounded-lg', small && 'p-2')}>
      <div className="flex items-center gap-2">
        <div className={cn('p-1.5 rounded', colorClasses[color])}>{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn('mt-2', small ? 'text-lg' : 'text-2xl', 'font-bold')}>{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mt-0.5">{subtext}</div>}
    </div>
  );
};

export default MetricsDashboard;
