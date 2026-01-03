/**
 * Types for Auto Claude Self-Improvement System
 *
 * Mirrors the Python models in auto-claude/improvement/models.py
 */

// ==================== Enums ====================

export type CardType = 'code' | 'ui_ux' | 'docs' | 'security' | 'performance' | 'quality' | 'reflection' | 'discovery' | 'optimization';

export type CardStatus = 'proposed' | 'approved' | 'applied' | 'dismissed';

export type ActionType = 'prompt_update' | 'tool_install' | 'config_change' | 'code_change';

export type EffortLevel = 'trivial' | 'small' | 'medium' | 'large';

export type GoalType = 'metric' | 'discovery' | 'pattern_fix';

export type GoalStatus = 'active' | 'achieved' | 'abandoned';

// ==================== Interfaces ====================

/**
 * Evidence supporting an improvement card
 */
export interface CardEvidence {
  occurrences?: number;
  examples?: string[];
  metrics?: Record<string, number>;
  affected_specs?: string[];
  severity?: string;
  source?: string;
  type?: string;
  url?: string;
  relevance_score?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Suggested action for an improvement card
 */
export interface SuggestedAction {
  type: ActionType;
  details: string;
  effort: EffortLevel;
}

/**
 * An improvement card - proposed change requiring user approval
 */
export interface ImprovementCard {
  id: string;
  type: CardType;
  title: string;
  description: string;
  evidence: CardEvidence;
  suggested_action: SuggestedAction;
  status: CardStatus;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  applied_at?: string;
  goal_id?: string;
}

/**
 * Metric target for metric-based goals
 */
export interface GoalMetric {
  name: string;
  current: number;
  target: number;
  unit: string;
}

/**
 * An improvement goal driving the improvement loop
 */
export interface ImprovementGoal {
  id: string;
  type: GoalType;
  target: string;
  description: string;
  status: GoalStatus;
  metric?: GoalMetric;
  discovery_count?: number;
  discovered_so_far?: number;
  card_ids: string[];
  created_at: string;
  achieved_at?: string;
}

/**
 * Post-task reflection data
 */
export interface TaskReflection {
  task_id: string;
  spec_id: string;
  project_path: string;
  success: boolean;
  qa_iterations: number;
  total_duration_seconds: number;
  phase_durations: Record<string, number>;
  issues_found: Array<{
    type: string;
    description: string;
    section?: string;
  }>;
  issue_types: string[];
  fixes_applied: Array<{
    title: string;
    details: string[];
  }>;
  what_worked: string[];
  what_failed: string[];
  recommendations: string[];
  created_at: string;
}

/**
 * A detected recurring pattern
 */
export interface Pattern {
  id: string;
  issue_type: string;
  description: string;
  occurrences: number;
  examples: string[];
  affected_specs: string[];
  suggested_fix: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
}

/**
 * A discovered tool/package/MCP server
 */
export interface Discovery {
  id: string;
  source: string;
  type: string;
  name: string;
  description: string;
  url: string;
  relevance_score: number;
  metadata: Record<string, unknown>;
  discovered_at: string;
}

/**
 * Result from an improvement loop iteration
 */
export interface LoopResult {
  status: 'achieved' | 'awaiting_user' | 'max_iterations' | 'no_proposals' | 'stalled';
  iterations: number;
  final_metrics?: Record<string, unknown>;
  cards_proposed?: number;
  message?: string;
}

/**
 * Aggregated improvement metrics
 */
export interface ImprovementMetrics {
  // Task metrics
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;

  // QA metrics
  avg_qa_iterations: number;
  total_qa_iterations: number;

  // Duration metrics
  avg_task_duration_seconds: number;
  avg_planning_duration: number;
  avg_coding_duration: number;
  avg_validation_duration: number;

  // Pattern metrics
  recurring_patterns_count: number;
  patterns_fixed: number;

  // Card metrics
  cards_proposed: number;
  cards_approved: number;
  cards_applied: number;
  cards_dismissed: number;

  // Goal metrics
  active_goals: number;
  achieved_goals: number;
}

/**
 * Metrics summary for dashboard display
 */
export interface MetricsSummary {
  total_tasks: number;
  success_rate: number;
  avg_qa_iterations: number;
  common_issue_types: Array<{
    type: string;
    count: number;
  }>;
  avg_duration_seconds: number;
}

// ==================== UI State Types ====================

/**
 * State for the improvement tab
 */
export interface ImprovementState {
  goals: ImprovementGoal[];
  cards: ImprovementCard[];
  patterns: Pattern[];
  metrics: ImprovementMetrics | null;
  discoveries: Discovery[];
  reflections: TaskReflection[];

  // UI state
  selectedGoalId: string | null;
  selectedCardId: string | null;
  isLoading: boolean;
  error: string | null;

  // Loop state
  activeLoopGoalId: string | null;
  loopIteration: number;
  loopStatus: LoopResult['status'] | null;
}

/**
 * Props for goal creation dialog
 */
export interface GoalCreationData {
  type: GoalType;
  target: string;
  description: string;
  metric?: {
    name: string;
    target: number;
    unit: string;
  };
  discoveryCount?: number;
}

/**
 * Filter options for cards list
 */
export interface CardFilterOptions {
  status?: CardStatus[];
  type?: CardType[];
  goalId?: string;
}

/**
 * Filter options for goals list
 */
export interface GoalFilterOptions {
  status?: GoalStatus[];
  type?: GoalType[];
}

// ==================== API Types ====================

import type { IPCResult } from './common';

/**
 * Improvement API interface for preload/renderer communication
 */
export interface ImprovementAPI {
  // Metrics
  getMetrics: (projectId: string) => Promise<IPCResult<ImprovementMetrics>>;

  // Cards
  getCards: (projectId: string) => Promise<IPCResult<ImprovementCard[]>>;
  updateCard: (cardId: string, updates: Partial<ImprovementCard>) => Promise<IPCResult<ImprovementCard>>;

  // Goals
  getGoals: (projectId: string) => Promise<IPCResult<ImprovementGoal[]>>;
  createGoal: (projectId: string, data: GoalCreationData) => Promise<IPCResult<ImprovementGoal>>;
  updateGoal: (goalId: string, updates: Partial<ImprovementGoal>) => Promise<IPCResult>;
  deleteGoal: (goalId: string) => Promise<IPCResult>;

  // Patterns
  getPatterns: (projectId: string) => Promise<IPCResult<Pattern[]>>;

  // Reflections
  getReflections: (projectId: string, limit?: number) => Promise<IPCResult<TaskReflection[]>>;

  // Loop
  runLoop: (projectId: string, goalId: string) => Promise<IPCResult<LoopResult>>;
  stopLoop: () => void;

  // Discovery
  discover: (projectId: string, query?: string) => Promise<IPCResult<Discovery[]>>;

  // Events
  onLoopStatus?: (callback: (status: LoopResult) => void) => void;
  onCardsUpdated?: (callback: (cards: ImprovementCard[]) => void) => void;
  onMetricsUpdated?: (callback: (metrics: ImprovementMetrics) => void) => void;
}
