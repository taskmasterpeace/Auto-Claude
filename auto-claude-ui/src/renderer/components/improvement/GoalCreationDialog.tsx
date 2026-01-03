/**
 * Goal Creation Dialog component
 *
 * Allows users to create new improvement goals.
 */

import React, { useState } from 'react';
import { useImprovementStore } from '../../stores/improvement-store';
import type { GoalType, GoalCreationData } from '../../../shared/types';
import { cn } from '../../lib/utils';
import { X, Target, TrendingUp, Search, AlertTriangle } from 'lucide-react';

interface GoalCreationDialogProps {
  projectId: string;
  onClose: () => void;
}

export const GoalCreationDialog: React.FC<GoalCreationDialogProps> = ({
  projectId,
  onClose,
}) => {
  const { createGoal } = useImprovementStore();
  const [goalType, setGoalType] = useState<GoalType>('metric');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Metric goal fields
  const [metricName, setMetricName] = useState('avg_qa_iterations');
  const [metricTarget, setMetricTarget] = useState(2);
  const [metricUnit, setMetricUnit] = useState('iterations');

  // Discovery goal fields
  const [discoveryType, setDiscoveryType] = useState('mcp_servers');
  const [discoveryCount, setDiscoveryCount] = useState(5);

  // Common fields
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: GoalCreationData = {
        type: goalType,
        target: getTarget(),
        description: description || getDefaultDescription(),
      };

      if (goalType === 'metric') {
        data.metric = {
          name: metricName,
          target: metricTarget,
          unit: metricUnit,
        };
      } else if (goalType === 'discovery') {
        data.discoveryCount = discoveryCount;
      }

      await createGoal(projectId, data);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTarget = (): string => {
    switch (goalType) {
      case 'metric':
        return `Improve ${metricName.replace(/_/g, ' ')}`;
      case 'discovery':
        return `Discover ${discoveryCount} ${discoveryType.replace(/_/g, ' ')}`;
      case 'pattern_fix':
        return 'Fix recurring issues';
      default:
        return 'Improvement goal';
    }
  };

  const getDefaultDescription = (): string => {
    switch (goalType) {
      case 'metric':
        return `Achieve ${metricName.replace(/_/g, ' ')} of ${metricTarget} ${metricUnit}`;
      case 'discovery':
        return `Find ${discoveryCount} relevant ${discoveryType.replace(/_/g, ' ')} for this project`;
      case 'pattern_fix':
        return 'Address high-severity recurring patterns detected in tasks';
      default:
        return '';
    }
  };

  const metricOptions = [
    { value: 'avg_qa_iterations', label: 'Average QA Iterations', unit: 'iterations', defaultTarget: 2 },
    { value: 'success_rate', label: 'Task Success Rate', unit: '%', defaultTarget: 90 },
    { value: 'avg_task_duration', label: 'Average Task Duration', unit: 'seconds', defaultTarget: 600 },
  ];

  const discoveryOptions = [
    { value: 'mcp_servers', label: 'MCP Servers' },
    { value: 'npm_packages', label: 'npm Packages' },
    { value: 'github_repos', label: 'GitHub Repos' },
    { value: 'tools', label: 'General Tools' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Create Improvement Goal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Goal type tabs */}
          <div className="flex border rounded-lg overflow-hidden">
            <GoalTypeTab
              type="metric"
              label="Improve Metric"
              icon={<TrendingUp className="w-4 h-4" />}
              selected={goalType === 'metric'}
              onClick={() => setGoalType('metric')}
            />
            <GoalTypeTab
              type="discovery"
              label="Discover Tools"
              icon={<Search className="w-4 h-4" />}
              selected={goalType === 'discovery'}
              onClick={() => setGoalType('discovery')}
            />
            <GoalTypeTab
              type="pattern_fix"
              label="Fix Patterns"
              icon={<AlertTriangle className="w-4 h-4" />}
              selected={goalType === 'pattern_fix'}
              onClick={() => setGoalType('pattern_fix')}
            />
          </div>

          {/* Metric fields */}
          {goalType === 'metric' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Metric</label>
                <select
                  value={metricName}
                  onChange={(e) => {
                    const option = metricOptions.find((o) => o.value === e.target.value);
                    setMetricName(e.target.value);
                    if (option) {
                      setMetricUnit(option.unit);
                      setMetricTarget(option.defaultTarget);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  {metricOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Target Value ({metricUnit})
                </label>
                <input
                  type="number"
                  value={metricTarget}
                  onChange={(e) => setMetricTarget(Number(e.target.value))}
                  min={0}
                  step={metricUnit === '%' ? 1 : 0.1}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
            </div>
          )}

          {/* Discovery fields */}
          {goalType === 'discovery' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Discovery Type</label>
                <select
                  value={discoveryType}
                  onChange={(e) => setDiscoveryType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  {discoveryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Count to Discover</label>
                <input
                  type="number"
                  value={discoveryCount}
                  onChange={(e) => setDiscoveryCount(Number(e.target.value))}
                  min={1}
                  max={20}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
            </div>
          )}

          {/* Pattern fix info */}
          {goalType === 'pattern_fix' && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>
                This goal will analyze recurring patterns detected across your tasks and
                generate improvement cards to address high-severity issues.
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={getDefaultDescription()}
              rows={2}
              className="w-full px-3 py-2 border rounded-md bg-background resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface GoalTypeTabProps {
  type: GoalType;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}

const GoalTypeTab: React.FC<GoalTypeTabProps> = ({
  type,
  label,
  icon,
  selected,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors',
      selected
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-muted'
    )}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default GoalCreationDialog;
