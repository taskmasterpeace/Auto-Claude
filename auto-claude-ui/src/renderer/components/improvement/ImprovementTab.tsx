/**
 * Main Improvement Tab component
 *
 * Displays the self-improvement dashboard with:
 * - Active goals and progress
 * - Improvement cards for review
 * - Metrics dashboard
 * - Pattern detection results
 */

import React, { useEffect, useState } from 'react';
import { useImprovementStore } from '../../stores/improvement-store';
import { useProjectStore } from '../../stores/project-store';
import { GoalCard } from './GoalCard';
import { ImprovementCard } from './ImprovementCard';
import { MetricsDashboard } from './MetricsDashboard';
import { GoalCreationDialog } from './GoalCreationDialog';
import { cn } from '../../lib/utils';
import { TaskReflectionCard } from './TaskReflectionCard';
import {
  Target,
  Lightbulb,
  TrendingUp,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  History,
  FileCode,
  AlertTriangle,
} from 'lucide-react';

export const ImprovementTab: React.FC = () => {
  const selectedProject = useProjectStore((s) => s.getSelectedProject());
  const {
    goals,
    cards,
    metrics,
    patterns,
    reflections,
    isLoading,
    error,
    activeLoopGoalId,
    loadAll,
    clearError,
    getPendingCards,
    getFilteredGoals,
  } = useImprovementStore();

  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'patterns' | 'history'>('overview');

  useEffect(() => {
    if (selectedProject?.id) {
      loadAll(selectedProject.id);
    }
  }, [selectedProject?.id, loadAll]);

  const pendingCards = getPendingCards();
  const activeGoals = getFilteredGoals().filter((g) => g.status === 'active');

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a project to view improvement insights</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Self-Improvement</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAll(selectedProject.id)}
            disabled={isLoading}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowGoalDialog(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New Goal</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border-b">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <button onClick={clearError} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex border-b px-4">
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          icon={<TrendingUp className="w-4 h-4" />}
          label="Overview"
        />
        <TabButton
          active={activeTab === 'cards'}
          onClick={() => setActiveTab('cards')}
          icon={<Lightbulb className="w-4 h-4" />}
          label="Cards"
          badge={pendingCards.length > 0 ? pendingCards.length : undefined}
        />
        <TabButton
          active={activeTab === 'patterns'}
          onClick={() => setActiveTab('patterns')}
          icon={<Search className="w-4 h-4" />}
          label="Patterns"
          badge={patterns.length > 0 ? patterns.length : undefined}
        />
        <TabButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          icon={<History className="w-4 h-4" />}
          label="History"
          badge={reflections.length > 0 ? reflections.length : undefined}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && !metrics ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === 'overview' ? (
          <OverviewContent
            goals={activeGoals}
            metrics={metrics}
            pendingCardsCount={pendingCards.length}
            activeLoopGoalId={activeLoopGoalId}
          />
        ) : activeTab === 'cards' ? (
          <CardsContent cards={cards} />
        ) : activeTab === 'patterns' ? (
          <PatternsContent patterns={patterns} />
        ) : (
          <HistoryContent reflections={reflections} />
        )}
      </div>

      {/* Goal creation dialog */}
      {showGoalDialog && (
        <GoalCreationDialog
          projectId={selectedProject.id}
          onClose={() => setShowGoalDialog(false)}
        />
      )}
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors',
      active
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    )}
  >
    {icon}
    <span className="text-sm">{label}</span>
    {badge !== undefined && (
      <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
        {badge}
      </span>
    )}
  </button>
);

interface OverviewContentProps {
  goals: ReturnType<typeof useImprovementStore.getState>['goals'];
  metrics: ReturnType<typeof useImprovementStore.getState>['metrics'];
  pendingCardsCount: number;
  activeLoopGoalId: string | null;
}

const OverviewContent: React.FC<OverviewContentProps> = ({
  goals,
  metrics,
  pendingCardsCount,
  activeLoopGoalId,
}) => (
  <div className="space-y-6">
    {/* Metrics dashboard */}
    {metrics && <MetricsDashboard metrics={metrics} />}

    {/* Active goals */}
    <div>
      <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
        <Target className="w-4 h-4" />
        Active Goals
      </h3>
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active goals. Create a goal to start the improvement loop.
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} isRunning={activeLoopGoalId === goal.id} />
          ))}
        </div>
      )}
    </div>

    {/* Pending cards summary */}
    {pendingCardsCount > 0 && (
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          <span className="font-medium">
            {pendingCardsCount} improvement{pendingCardsCount === 1 ? '' : 's'} awaiting review
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve proposed improvements to continue the improvement loop.
        </p>
      </div>
    )}
  </div>
);

interface CardsContentProps {
  cards: ReturnType<typeof useImprovementStore.getState>['cards'];
}

const CardsContent: React.FC<CardsContentProps> = ({ cards }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCards = cards.filter((card) => {
    if (statusFilter === 'all') return true;
    return card.status === statusFilter;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'proposed', 'approved', 'applied', 'dismissed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Cards list */}
      {filteredCards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No improvement cards{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredCards.map((card) => (
            <ImprovementCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
};

interface PatternsContentProps {
  patterns: ReturnType<typeof useImprovementStore.getState>['patterns'];
}

const PatternsContent: React.FC<PatternsContentProps> = ({ patterns }) => {
  if (patterns.length === 0) {
    return (
      <div className="text-center py-8">
        <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          No recurring patterns detected yet.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Patterns are automatically detected after 3+ tasks with similar issues.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <h3 className="font-medium">Detected Patterns</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          These patterns were detected across multiple tasks. Addressing them can prevent
          future issues and reduce QA iterations.
        </p>
      </div>

      {/* Pattern cards */}
      {patterns.map((pattern) => (
        <div
          key={pattern.id}
          className={cn(
            'p-4 border rounded-lg transition-colors',
            pattern.severity === 'high'
              ? 'border-red-500/30 bg-red-500/5'
              : pattern.severity === 'medium'
                ? 'border-yellow-500/30 bg-yellow-500/5'
                : 'border-border hover:border-primary/50'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'p-2 rounded-lg',
                  pattern.severity === 'high'
                    ? 'bg-red-500/10'
                    : pattern.severity === 'medium'
                      ? 'bg-yellow-500/10'
                      : 'bg-muted'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'w-4 h-4',
                    pattern.severity === 'high'
                      ? 'text-red-600'
                      : pattern.severity === 'medium'
                        ? 'text-yellow-600'
                        : 'text-muted-foreground'
                  )}
                />
              </div>
              <div>
                <h4 className="font-medium capitalize">
                  {pattern.issue_type.replace(/_/g, ' ')}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full font-medium',
                  pattern.severity === 'high'
                    ? 'bg-red-500/20 text-red-700'
                    : pattern.severity === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-700'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {pattern.severity.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Occurrences:</span>
              <span className="font-semibold text-primary">{pattern.occurrences}x</span>
            </div>
            {pattern.affected_specs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Affected tasks:</span>
                <span className="font-medium">{pattern.affected_specs.length}</span>
              </div>
            )}
          </div>

          {/* Real examples from code */}
          {pattern.examples.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                Real Examples From Your Code
              </h5>
              <div className="space-y-2">
                {pattern.examples.slice(0, 5).map((ex, i) => (
                  <div
                    key={i}
                    className="bg-background p-2 rounded border border-border/50 font-mono text-xs overflow-x-auto"
                  >
                    <code className="text-red-500 whitespace-pre-wrap break-all">{ex}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affected specs */}
          {pattern.affected_specs.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium mb-2">Affected Tasks</h5>
              <div className="flex flex-wrap gap-1.5">
                {pattern.affected_specs.map((spec, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-muted rounded-full font-mono"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested fix */}
          <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <h5 className="text-sm font-medium mb-1 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-green-600" />
              Suggested Fix
            </h5>
            <p className="text-sm text-muted-foreground">{pattern.suggested_fix}</p>
          </div>

          {/* Created timestamp */}
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            First detected: {new Date(pattern.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== History Content ====================

interface HistoryContentProps {
  reflections: ReturnType<typeof useImprovementStore.getState>['reflections'];
}

const HistoryContent: React.FC<HistoryContentProps> = ({ reflections }) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');

  const filteredReflections = reflections.filter((r) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'success') return r.success;
    if (filterStatus === 'failed') return !r.success;
    return true;
  });

  // Calculate summary stats
  const successCount = reflections.filter((r) => r.success).length;
  const failedCount = reflections.filter((r) => !r.success).length;
  const avgQaIterations =
    reflections.length > 0
      ? reflections.reduce((acc, r) => acc + r.qa_iterations, 0) / reflections.length
      : 0;
  const avgDuration =
    reflections.length > 0
      ? reflections.reduce((acc, r) => acc + r.total_duration_seconds, 0) / reflections.length
      : 0;

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  if (reflections.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          No task history yet.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Task reflections are automatically recorded after each build completes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <p className="text-2xl font-bold">{reflections.length}</p>
          <p className="text-xs text-muted-foreground">Total Tasks</p>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{successCount}</p>
          <p className="text-xs text-muted-foreground">Successful</p>
        </div>
        <div className="p-3 bg-red-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600">{failedCount}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{avgQaIterations.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Avg QA Iterations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'success', 'failed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              filterStatus === status
                ? status === 'success'
                  ? 'bg-green-500 text-white'
                  : status === 'failed'
                    ? 'bg-red-500 text-white'
                    : 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'all' && ` (${reflections.length})`}
            {status === 'success' && ` (${successCount})`}
            {status === 'failed' && ` (${failedCount})`}
          </button>
        ))}
      </div>

      {/* Reflections list */}
      {filteredReflections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No tasks matching filter "{filterStatus}".
        </p>
      ) : (
        <div className="space-y-3">
          {filteredReflections.map((reflection) => (
            <TaskReflectionCard key={reflection.task_id} reflection={reflection} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImprovementTab;
