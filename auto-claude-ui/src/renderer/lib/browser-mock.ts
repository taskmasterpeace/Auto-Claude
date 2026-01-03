/**
 * Browser mock for window.electronAPI
 * This allows the app to run in a regular browser for UI development/testing
 *
 * This module aggregates all mock implementations from separate modules
 * for better code organization and maintainability.
 */

import type { ElectronAPI } from '../../shared/types';
import {
  projectMock,
  taskMock,
  workspaceMock,
  terminalMock,
  claudeProfileMock,
  contextMock,
  integrationMock,
  changelogMock,
  insightsMock,
  infrastructureMock,
  settingsMock
} from './mocks';

// Check if we're in a browser (not Electron)
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

/**
 * Create mock electronAPI for browser
 * Aggregates all mock implementations from separate modules
 */
const browserMockAPI: ElectronAPI = {
  // Project Operations
  ...projectMock,

  // Task Operations
  ...taskMock,

  // Workspace Management
  ...workspaceMock,

  // Terminal Operations
  ...terminalMock,

  // Claude Profile Management
  ...claudeProfileMock,

  // Settings
  ...settingsMock,

  // Roadmap Operations
  getRoadmap: async () => ({
    success: true,
    data: null
  }),

  getRoadmapStatus: async () => ({
    success: true,
    data: { isRunning: false }
  }),

  saveRoadmap: async () => ({
    success: true
  }),

  generateRoadmap: (_projectId: string, _enableCompetitorAnalysis?: boolean, _refreshCompetitorAnalysis?: boolean) => {
    console.warn('[Browser Mock] generateRoadmap called');
  },

  refreshRoadmap: (_projectId: string, _enableCompetitorAnalysis?: boolean, _refreshCompetitorAnalysis?: boolean) => {
    console.warn('[Browser Mock] refreshRoadmap called');
  },

  updateFeatureStatus: async () => ({ success: true }),

  convertFeatureToSpec: async (projectId: string, _featureId: string) => ({
    success: true,
    data: {
      id: `task-${Date.now()}`,
      specId: '',
      projectId,
      title: 'Converted Feature',
      description: 'Feature converted from roadmap',
      status: 'backlog' as const,
      subtasks: [],
      logs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }),

  stopRoadmap: async () => ({ success: true }),

  // Roadmap Event Listeners
  onRoadmapProgress: () => () => {},
  onRoadmapComplete: () => () => {},
  onRoadmapError: () => () => {},
  onRoadmapStopped: () => () => {},
  // Context Operations
  ...contextMock,

  // Environment Configuration & Integration Operations
  ...integrationMock,

  // Changelog & Release Operations
  ...changelogMock,

  // Insights Operations
  ...insightsMock,

  // Infrastructure & Docker Operations
  ...infrastructureMock,

  // Self-improvement Operations (nested API)
  improvement: {
    getMetrics: async () => ({
      success: true,
      data: {
        total_tasks: 0,
        successful_tasks: 0,
        failed_tasks: 0,
        avg_qa_iterations: 0,
        total_qa_iterations: 0,
        avg_task_duration_seconds: 0,
        avg_planning_duration: 0,
        avg_coding_duration: 0,
        avg_validation_duration: 0,
        recurring_patterns_count: 0,
        patterns_fixed: 0,
        cards_proposed: 0,
        cards_approved: 0,
        cards_applied: 0,
        cards_dismissed: 0,
        active_goals: 0,
        achieved_goals: 0,
      },
    }),
    getCards: async () => ({ success: true, data: [] }),
    updateCard: async () => ({ success: true, data: {} as never }),
    getGoals: async () => ({ success: true, data: [] }),
    createGoal: async () => ({ success: true, data: {} as never }),
    updateGoal: async () => ({ success: true }),
    deleteGoal: async () => ({ success: true }),
    getPatterns: async () => ({ success: true, data: [] }),
    getReflections: async () => ({ success: true, data: [] }),
    runLoop: async () => ({
      success: true,
      data: { status: 'awaiting_user' as const, iterations: 0 },
    }),
    stopLoop: () => {},
    discover: async () => ({ success: true, data: [] }),
    onLoopStatus: () => {},
    onCardsUpdated: () => {},
    onMetricsUpdated: () => {},
  }
};

/**
 * Initialize browser mock if not running in Electron
 */
export function initBrowserMock(): void {
  if (!isElectron) {
    console.warn('%c[Browser Mock] Initializing mock electronAPI for browser preview', 'color: #f0ad4e; font-weight: bold;');
    (window as Window & { electronAPI: ElectronAPI }).electronAPI = browserMockAPI;
  }
}

// Auto-initialize
initBrowserMock();
