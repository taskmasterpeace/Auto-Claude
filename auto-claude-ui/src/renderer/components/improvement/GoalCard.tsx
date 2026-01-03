/**
 * Goal Card component
 *
 * Displays an improvement goal with its status, progress,
 * and detailed context about what the goal means and its impact.
 */

import React, { useState } from 'react';
import { useImprovementStore } from '../../stores/improvement-store';
import type { ImprovementGoal } from '../../../shared/types';
import { cn } from '../../lib/utils';
import {
  Target,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Lightbulb,
  ArrowRight,
  Zap,
  RotateCw,
  Award,
} from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

interface GoalCardProps {
  goal: ImprovementGoal;
  isRunning?: boolean;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, isRunning = false }) => {
  const selectedProject = useProjectStore((s) => s.getSelectedProject());
  const { startLoop, stopLoop, deleteGoal, abandonGoal, getCardsForGoal } = useImprovementStore();
  const [expanded, setExpanded] = useState(false);

  const cards = getCardsForGoal(goal.id);
  const approvedCount = cards.filter((c) => c.status === 'approved').length;
  const appliedCount = cards.filter((c) => c.status === 'applied').length;
  const proposedCount = cards.filter((c) => c.status === 'proposed').length;

  const getProgress = (): number => {
    if (goal.type === 'metric' && goal.metric) {
      const { current, target } = goal.metric;
      // For metrics where lower is better
      if (goal.metric.name.includes('iterations') || goal.metric.name.includes('duration')) {
        if (current <= target) return 100;
        const range = current - target;
        return Math.max(0, Math.min(100, ((current - target) / range) * 100));
      }
      // For metrics where higher is better
      return Math.min(100, (current / target) * 100);
    }
    if (goal.type === 'discovery') {
      if (!goal.discovery_count) return 0;
      return Math.min(100, ((goal.discovered_so_far || 0) / goal.discovery_count) * 100);
    }
    return 0;
  };

  const progress = getProgress();

  const getTypeIcon = () => {
    switch (goal.type) {
      case 'metric':
        return <TrendingUp className="w-4 h-4" />;
      case 'discovery':
        return <Search className="w-4 h-4" />;
      case 'pattern_fix':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (goal.status) {
      case 'achieved':
        return 'border-green-500/50 bg-green-500/5';
      case 'abandoned':
        return 'border-muted bg-muted/50 opacity-60';
      default:
        return 'border-border hover:border-primary/50';
    }
  };

  const handleStartLoop = () => {
    if (selectedProject?.id) {
      startLoop(selectedProject.id, goal.id);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this goal?')) {
      deleteGoal(goal.id);
    }
  };

  // Get context about what this goal means
  const getGoalExplanation = () => {
    switch (goal.type) {
      case 'metric':
        if (goal.metric?.name.includes('qa_iterations')) {
          return {
            what: 'Reduce the number of back-and-forth cycles between QA and fixing',
            why: 'Fewer QA iterations means faster delivery and fewer bugs making it to review',
            how: 'The system will analyze why issues are occurring and suggest preventive measures',
          };
        }
        if (goal.metric?.name.includes('success_rate')) {
          return {
            what: 'Increase the percentage of tasks that pass QA on the first attempt',
            why: 'Higher success rate means more predictable delivery and better code quality',
            how: 'Patterns from failed tasks will be analyzed to prevent similar issues',
          };
        }
        if (goal.metric?.name.includes('duration')) {
          return {
            what: 'Reduce the time taken to complete tasks',
            why: 'Faster completion means more tasks can be delivered in the same time',
            how: 'Bottlenecks in the workflow will be identified and addressed',
          };
        }
        return {
          what: `Improve ${goal.metric?.name.replace(/_/g, ' ')} to reach the target`,
          why: 'Meeting this metric will improve overall development efficiency',
          how: 'The system will propose changes to help achieve this target',
        };
      case 'discovery':
        return {
          what: 'Find useful tools, MCP servers, or packages for your project',
          why: 'New tools can automate tasks, improve code quality, or add capabilities',
          how: 'Searches GitHub, npm, and MCP registries for relevant tools',
        };
      case 'pattern_fix':
        return {
          what: 'Address recurring issues detected across multiple tasks',
          why: 'Fixing patterns prevents the same issues from happening repeatedly',
          how: 'Analyzes past failures to suggest systemic improvements',
        };
      default:
        return {
          what: goal.description,
          why: 'Achieving this goal will improve the development workflow',
          how: 'The improvement loop will generate actionable cards',
        };
    }
  };

  const explanation = getGoalExplanation();

  return (
    <div className={cn('border rounded-lg transition-colors', getStatusColor())}>
      {/* Header - always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'p-2 rounded-lg',
              goal.status === 'achieved' ? 'bg-green-500/10' : 'bg-muted'
            )}>
              {getTypeIcon()}
            </div>
            <div>
              <h4 className="font-medium">{goal.target}</h4>
              <p className="text-sm text-muted-foreground mt-0.5">{goal.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {goal.status === 'achieved' ? (
              <Award className="w-5 h-5 text-green-500" />
            ) : goal.status === 'abandoned' ? (
              <XCircle className="w-5 h-5 text-muted-foreground" />
            ) : isRunning ? (
              <button
                onClick={(e) => { e.stopPropagation(); stopLoop(); }}
                className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                title="Stop loop"
              >
                <Pause className="w-4 h-4 text-destructive" />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleStartLoop(); }}
                className="p-1.5 hover:bg-primary/10 rounded transition-colors"
                title="Start improvement loop"
              >
                <Play className="w-4 h-4 text-primary" />
              </button>
            )}
            {goal.status !== 'achieved' && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                title="Delete goal"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        {goal.status === 'active' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  isRunning ? 'bg-primary animate-pulse' : 'bg-primary'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick stats row */}
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          {/* Metric details */}
          {goal.type === 'metric' && goal.metric && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Current:</span>
                <span className={cn(
                  'font-semibold',
                  goal.metric.current <= goal.metric.target ? 'text-green-600' : 'text-red-600'
                )}>
                  {goal.metric.current.toFixed(1)} {goal.metric.unit}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Target:</span>
                <span className="font-semibold text-primary">
                  {goal.metric.target.toFixed(1)} {goal.metric.unit}
                </span>
              </div>
            </>
          )}

          {/* Discovery details */}
          {goal.type === 'discovery' && goal.discovery_count && (
            <div className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">
                {goal.discovered_so_far || 0} / {goal.discovery_count} discovered
              </span>
            </div>
          )}

          {/* Cards summary */}
          {cards.length > 0 && (
            <div className="flex items-center gap-3 ml-auto">
              {proposedCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <RotateCw className="w-3.5 h-3.5" />
                  {proposedCount} pending
                </span>
              )}
              {approvedCount > 0 && (
                <span className="flex items-center gap-1 text-blue-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {approvedCount} approved
                </span>
              )}
              {appliedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <Zap className="w-3.5 h-3.5" />
                  {appliedCount} applied
                </span>
              )}
            </div>
          )}
        </div>

        {/* Running indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t text-sm text-primary">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Improvement loop running...</span>
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t pt-4 space-y-4">
          {/* What this goal means */}
          <div>
            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What This Goal Means
            </h5>
            <p className="text-sm text-muted-foreground">{explanation.what}</p>
          </div>

          {/* Why it matters */}
          <div>
            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              Why It Matters
            </h5>
            <p className="text-sm text-muted-foreground">{explanation.why}</p>
          </div>

          {/* How it works */}
          <div>
            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-blue-600" />
              How The Loop Works
            </h5>
            <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">{explanation.how}</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Analyze task history and patterns</li>
                <li>Generate improvement cards with specific suggestions</li>
                <li>Wait for you to approve or dismiss each card</li>
                <li>Track progress toward the goal</li>
                <li>Repeat until goal is achieved</li>
              </ol>
            </div>
          </div>

          {/* Generated cards detail */}
          {cards.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                Generated Cards ({cards.length})
              </h5>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-yellow-500/10 rounded">
                  <p className="text-lg font-bold text-yellow-600">{proposedCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="p-2 bg-blue-500/10 rounded">
                  <p className="text-lg font-bold text-blue-600">{approvedCount}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
                <div className="p-2 bg-green-500/10 rounded">
                  <p className="text-lg font-bold text-green-600">{appliedCount}</p>
                  <p className="text-xs text-muted-foreground">Applied</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold text-muted-foreground">
                    {cards.filter((c) => c.status === 'dismissed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Dismissed</p>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created: {new Date(goal.created_at).toLocaleDateString()}
            </span>
            {goal.status === 'achieved' && goal.achieved_at && (
              <span className="flex items-center gap-1 text-green-600">
                <Award className="w-3 h-3" />
                Achieved: {new Date(goal.achieved_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalCard;
