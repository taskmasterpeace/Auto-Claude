/**
 * Improvement API
 *
 * Preload API for the Auto Claude Self-Improvement system.
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type {
  IPCResult,
  ImprovementMetrics,
  ImprovementCard,
  ImprovementGoal,
  Pattern,
  TaskReflection,
  Discovery,
  LoopResult,
  GoalCreationData,
  CardStatus,
} from '../../shared/types';

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

export const createImprovementAPI = (): ImprovementAPI => ({
  // Metrics
  getMetrics: (projectId: string): Promise<IPCResult<ImprovementMetrics>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_GET_METRICS, projectId),

  // Cards
  getCards: (projectId: string): Promise<IPCResult<ImprovementCard[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_GET_CARDS, projectId),

  updateCard: (cardId: string, updates: Partial<ImprovementCard>): Promise<IPCResult<ImprovementCard>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_UPDATE_CARD, cardId, updates),

  // Goals
  getGoals: (projectId: string): Promise<IPCResult<ImprovementGoal[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_GET_GOALS, projectId),

  createGoal: (projectId: string, data: GoalCreationData): Promise<IPCResult<ImprovementGoal>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_CREATE_GOAL, projectId, data),

  updateGoal: (goalId: string, updates: Partial<ImprovementGoal>): Promise<IPCResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_UPDATE_GOAL, goalId, updates),

  deleteGoal: (goalId: string): Promise<IPCResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_DELETE_GOAL, goalId),

  // Patterns
  getPatterns: (projectId: string): Promise<IPCResult<Pattern[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_GET_PATTERNS, projectId),

  // Reflections
  getReflections: (projectId: string, limit?: number): Promise<IPCResult<TaskReflection[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_GET_REFLECTIONS, projectId, limit),

  // Loop
  runLoop: (projectId: string, goalId: string): Promise<IPCResult<LoopResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_RUN_LOOP, projectId, goalId),

  stopLoop: (): void => {
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_STOP_LOOP);
  },

  // Discovery
  discover: (projectId: string, query?: string): Promise<IPCResult<Discovery[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPROVEMENT_DISCOVER, projectId, query),

  // Events
  onLoopStatus: (callback: (status: LoopResult) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.IMPROVEMENT_LOOP_STATUS, (_, status) => callback(status));
  },

  onCardsUpdated: (callback: (cards: ImprovementCard[]) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.IMPROVEMENT_CARDS_UPDATED, (_, cards) => callback(cards));
  },

  onMetricsUpdated: (callback: (metrics: ImprovementMetrics) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.IMPROVEMENT_METRICS_UPDATED, (_, metrics) => callback(metrics));
  },
});
