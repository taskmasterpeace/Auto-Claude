/**
 * Improvement Handlers
 *
 * IPC handlers for the Auto Claude Self-Improvement system.
 * Handles metrics, cards, goals, patterns, reflections, and the improvement loop.
 */

import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
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
import { projectStore } from '../project-store';

/**
 * Get the improvement data directory for a project
 */
function getImprovementDir(projectPath: string): string {
  return path.join(projectPath, '.auto-claude', 'improvement');
}

/**
 * Ensure the improvement directory exists
 */
function ensureImprovementDir(projectPath: string): string {
  const dir = getImprovementDir(projectPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Load JSON data from improvement directory
 */
function loadJson<T>(projectPath: string, filename: string, defaultValue: T): T {
  try {
    const dir = getImprovementDir(projectPath);
    const filepath = path.join(dir, filename);
    if (!existsSync(filepath)) {
      return defaultValue;
    }
    const content = readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

/**
 * Save JSON data to improvement directory
 */
function saveJson(projectPath: string, filename: string, data: unknown): void {
  const dir = ensureImprovementDir(projectPath);
  const filepath = path.join(dir, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2));
}

/**
 * Register all improvement-related IPC handlers
 */
export function registerImprovementHandlers(
  getMainWindow: () => BrowserWindow | null
): void {
  // ============================================
  // Metrics Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_GET_METRICS,
    async (_, projectId: string): Promise<IPCResult<ImprovementMetrics>> => {
      try {
        const project = projectStore.getProject(projectId);
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        const data = loadJson<{ metrics?: ImprovementMetrics }>(project.path, 'metrics.json', {});
        const metrics = data.metrics || {
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
        };

        return { success: true, data: metrics };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get metrics',
        };
      }
    }
  );

  // ============================================
  // Cards Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_GET_CARDS,
    async (_, projectId: string): Promise<IPCResult<ImprovementCard[]>> => {
      try {
        const project = projectStore.getProject(projectId);
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        const data = loadJson<{ cards?: ImprovementCard[] }>(project.path, 'cards.json', {});
        return { success: true, data: data.cards || [] };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get cards',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_UPDATE_CARD,
    async (
      _,
      cardId: string,
      updates: Partial<ImprovementCard>
    ): Promise<IPCResult<ImprovementCard>> => {
      try {
        // Find the card across all projects
        const projects = projectStore.getProjects();
        for (const project of projects) {
          const data = loadJson<{ cards?: ImprovementCard[] }>(project.path, 'cards.json', {});
          const cards = data.cards || [];
          const cardIndex = cards.findIndex((c) => c.id === cardId);

          if (cardIndex !== -1) {
            const updatedCard = {
              ...cards[cardIndex],
              ...updates,
              updated_at: new Date().toISOString(),
            };

            // Add timestamps for status changes
            if (updates.status === 'approved') {
              updatedCard.approved_at = new Date().toISOString();
            } else if (updates.status === 'applied') {
              updatedCard.applied_at = new Date().toISOString();
            }

            cards[cardIndex] = updatedCard;
            saveJson(project.path, 'cards.json', { cards });

            // Update metrics
            updateCardMetrics(project.path, cards);

            // Notify renderer
            const mainWindow = getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.send(IPC_CHANNELS.IMPROVEMENT_CARDS_UPDATED, cards);
            }

            return { success: true, data: updatedCard };
          }
        }

        return { success: false, error: 'Card not found' };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update card',
        };
      }
    }
  );

  // ============================================
  // Goals Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_GET_GOALS,
    async (_, projectId: string): Promise<IPCResult<ImprovementGoal[]>> => {
      try {
        const project = projectStore.getProject(projectId);
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        const data = loadJson<{ goals?: ImprovementGoal[] }>(project.path, 'goals.json', {});
        return { success: true, data: data.goals || [] };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get goals',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_CREATE_GOAL,
    async (_, projectId: string, goalData: GoalCreationData): Promise<IPCResult<ImprovementGoal>> => {
      try {
        const project = projectStore.getProject(projectId);
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        const data = loadJson<{ goals?: ImprovementGoal[] }>(project.path, 'goals.json', {});
        const goals = data.goals || [];

        const newGoal: ImprovementGoal = {
          id: `goal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          type: goalData.type,
          target: goalData.target,
          description: goalData.description,
          status: 'active',
          card_ids: [],
          created_at: new Date().toISOString(),
        };

        if (goalData.metric) {
          newGoal.metric = {
            name: goalData.metric.name,
            current: 0, // Will be calculated
            target: goalData.metric.target,
            unit: goalData.metric.unit,
          };
        }

        if (goalData.discoveryCount) {
          newGoal.discovery_count = goalData.discoveryCount;
          newGoal.discovered_so_far = 0;
        }

        goals.push(newGoal);
        saveJson(project.path, 'goals.json', { goals });

        return { success: true, data: newGoal };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create goal',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_UPDATE_GOAL,
    async (_, goalId: string, updates: Partial<ImprovementGoal>): Promise<IPCResult> => {
      try {
        const projects = projectStore.getProjects();
        for (const project of projects) {
          const data = loadJson<{ goals?: ImprovementGoal[] }>(project.path, 'goals.json', {});
          const goals = data.goals || [];
          const goalIndex = goals.findIndex((g) => g.id === goalId);

          if (goalIndex !== -1) {
            goals[goalIndex] = { ...goals[goalIndex], ...updates };
            saveJson(project.path, 'goals.json', { goals });
            return { success: true };
          }
        }

        return { success: false, error: 'Goal not found' };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update goal',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_DELETE_GOAL,
    async (_, goalId: string): Promise<IPCResult> => {
      try {
        const projects = projectStore.getProjects();
        for (const project of projects) {
          const data = loadJson<{ goals?: ImprovementGoal[] }>(project.path, 'goals.json', {});
          const goals = data.goals || [];
          const goalIndex = goals.findIndex((g) => g.id === goalId);

          if (goalIndex !== -1) {
            goals.splice(goalIndex, 1);
            saveJson(project.path, 'goals.json', { goals });
            return { success: true };
          }
        }

        return { success: false, error: 'Goal not found' };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete goal',
        };
      }
    }
  );

  // ============================================
  // Patterns Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_GET_PATTERNS,
    async (_, projectId: string): Promise<IPCResult<Pattern[]>> => {
      try {
        const project = projectStore.getProject(projectId);
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        const data = loadJson<{ patterns?: Pattern[] }>(project.path, 'patterns.json', {});
        return { success: true, data: data.patterns || [] };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get patterns',
        };
      }
    }
  );

  // ============================================
  // Reflections Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_GET_REFLECTIONS,
    async (_, projectId: string, limit?: number): Promise<IPCResult<TaskReflection[]>> => {
      try {
        const project = projectStore.getProject(projectId);
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        const data = loadJson<{ reflections?: TaskReflection[] }>(project.path, 'reflections.json', {});
        let reflections = data.reflections || [];

        // Sort by created_at descending
        reflections.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Apply limit
        if (limit && limit > 0) {
          reflections = reflections.slice(0, limit);
        }

        return { success: true, data: reflections };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get reflections',
        };
      }
    }
  );

  // ============================================
  // Loop Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_RUN_LOOP,
    async (_, projectId: string, goalId: string): Promise<IPCResult<LoopResult>> => {
      try {
        const project = projectStore.getProject(projectId);
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        // For now, return a placeholder - the actual loop runs in Python
        // This handler signals the UI that the loop has been requested
        // The Python improvement loop will be invoked separately

        const result: LoopResult = {
          status: 'awaiting_user',
          iterations: 1,
          message: 'Improvement loop started. Review proposed cards to continue.',
        };

        // Notify renderer of loop status
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send(IPC_CHANNELS.IMPROVEMENT_LOOP_STATUS, result);
        }

        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to run improvement loop',
        };
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.IMPROVEMENT_STOP_LOOP, async (): Promise<IPCResult> => {
    // Stop the improvement loop
    // This is handled by the Python process management
    return { success: true };
  });

  // ============================================
  // Discovery Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.IMPROVEMENT_DISCOVER,
    async (_, projectId: string, query?: string): Promise<IPCResult<Discovery[]>> => {
      try {
        const project = projectStore.getProject(projectId);
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        // For now, return empty - discovery requires async API calls
        // The actual discovery runs in Python with web access
        return { success: true, data: [] };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to run discovery',
        };
      }
    }
  );
}

/**
 * Update card metrics after card changes
 */
function updateCardMetrics(projectPath: string, cards: ImprovementCard[]): void {
  const metricsData = loadJson<{ metrics?: ImprovementMetrics }>(projectPath, 'metrics.json', {});
  const metrics = metricsData.metrics || ({} as ImprovementMetrics);

  metrics.cards_proposed = cards.filter((c) => c.status === 'proposed').length;
  metrics.cards_approved = cards.filter((c) => c.status === 'approved').length;
  metrics.cards_applied = cards.filter((c) => c.status === 'applied').length;
  metrics.cards_dismissed = cards.filter((c) => c.status === 'dismissed').length;

  saveJson(projectPath, 'metrics.json', { metrics });
}

export default registerImprovementHandlers;
