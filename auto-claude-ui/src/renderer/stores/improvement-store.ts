/**
 * Zustand store for Auto Claude Self-Improvement System
 */

import { create } from 'zustand';
import type {
  ImprovementCard,
  ImprovementGoal,
  ImprovementMetrics,
  Pattern,
  Discovery,
  TaskReflection,
  LoopResult,
  CardStatus,
  GoalType,
  GoalCreationData,
  CardFilterOptions,
  GoalFilterOptions,
} from '../../shared/types';

interface ImprovementState {
  // Data
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

  // Filters
  cardFilters: CardFilterOptions;
  goalFilters: GoalFilterOptions;
}

interface ImprovementActions {
  // Data loading
  loadMetrics: (projectId: string) => Promise<void>;
  loadCards: (projectId: string) => Promise<void>;
  loadGoals: (projectId: string) => Promise<void>;
  loadPatterns: (projectId: string) => Promise<void>;
  loadReflections: (projectId: string, limit?: number) => Promise<void>;
  loadAll: (projectId: string) => Promise<void>;

  // Card actions
  updateCardStatus: (cardId: string, status: CardStatus) => Promise<void>;
  approveCard: (cardId: string) => Promise<void>;
  dismissCard: (cardId: string) => Promise<void>;
  applyCard: (cardId: string) => Promise<void>;

  // Goal actions
  createGoal: (projectId: string, data: GoalCreationData) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<ImprovementGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  abandonGoal: (goalId: string) => Promise<void>;

  // Loop actions
  startLoop: (projectId: string, goalId: string) => Promise<void>;
  stopLoop: () => void;

  // Discovery actions
  runDiscovery: (projectId: string, query?: string) => Promise<void>;

  // UI actions
  selectGoal: (goalId: string | null) => void;
  selectCard: (cardId: string | null) => void;
  setCardFilters: (filters: CardFilterOptions) => void;
  setGoalFilters: (filters: GoalFilterOptions) => void;
  clearError: () => void;

  // Computed getters
  getFilteredCards: () => ImprovementCard[];
  getFilteredGoals: () => ImprovementGoal[];
  getCardsForGoal: (goalId: string) => ImprovementCard[];
  getPendingCards: () => ImprovementCard[];
}

const initialState: ImprovementState = {
  goals: [],
  cards: [],
  patterns: [],
  metrics: null,
  discoveries: [],
  reflections: [],
  selectedGoalId: null,
  selectedCardId: null,
  isLoading: false,
  error: null,
  activeLoopGoalId: null,
  loopIteration: 0,
  loopStatus: null,
  cardFilters: {},
  goalFilters: {},
};

export const useImprovementStore = create<ImprovementState & ImprovementActions>((set, get) => ({
  ...initialState,

  // Data loading
  loadMetrics: async (projectId: string) => {
    try {
      const result = await window.electronAPI.improvement.getMetrics(projectId);
      if (result.success && result.data) {
        set({ metrics: result.data });
      }
    } catch (error) {
      set({ error: `Failed to load metrics: ${error}` });
    }
  },

  loadCards: async (projectId: string) => {
    try {
      const result = await window.electronAPI.improvement.getCards(projectId);
      if (result.success && result.data) {
        set({ cards: result.data });
      }
    } catch (error) {
      set({ error: `Failed to load cards: ${error}` });
    }
  },

  loadGoals: async (projectId: string) => {
    try {
      const result = await window.electronAPI.improvement.getGoals(projectId);
      if (result.success && result.data) {
        set({ goals: result.data });
      }
    } catch (error) {
      set({ error: `Failed to load goals: ${error}` });
    }
  },

  loadPatterns: async (projectId: string) => {
    try {
      const result = await window.electronAPI.improvement.getPatterns(projectId);
      if (result.success && result.data) {
        set({ patterns: result.data });
      }
    } catch (error) {
      set({ error: `Failed to load patterns: ${error}` });
    }
  },

  loadReflections: async (projectId: string, limit = 20) => {
    try {
      const result = await window.electronAPI.improvement.getReflections(projectId, limit);
      if (result.success && result.data) {
        set({ reflections: result.data });
      }
    } catch (error) {
      set({ error: `Failed to load reflections: ${error}` });
    }
  },

  loadAll: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().loadMetrics(projectId),
        get().loadCards(projectId),
        get().loadGoals(projectId),
        get().loadPatterns(projectId),
        get().loadReflections(projectId),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },

  // Card actions
  updateCardStatus: async (cardId: string, status: CardStatus) => {
    try {
      const result = await window.electronAPI.improvement.updateCard(cardId, { status });
      if (result.success) {
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === cardId ? { ...c, status, updated_at: new Date().toISOString() } : c
          ),
        }));
      }
    } catch (error) {
      set({ error: `Failed to update card: ${error}` });
    }
  },

  approveCard: async (cardId: string) => {
    await get().updateCardStatus(cardId, 'approved');
  },

  dismissCard: async (cardId: string) => {
    await get().updateCardStatus(cardId, 'dismissed');
  },

  applyCard: async (cardId: string) => {
    await get().updateCardStatus(cardId, 'applied');
  },

  // Goal actions
  createGoal: async (projectId: string, data: GoalCreationData) => {
    try {
      const result = await window.electronAPI.improvement.createGoal(projectId, data);
      if (result.success && result.data) {
        set((state) => ({
          goals: [result.data!, ...state.goals],
        }));
      }
    } catch (error) {
      set({ error: `Failed to create goal: ${error}` });
    }
  },

  updateGoal: async (goalId: string, updates: Partial<ImprovementGoal>) => {
    try {
      const result = await window.electronAPI.improvement.updateGoal(goalId, updates);
      if (result.success) {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === goalId ? { ...g, ...updates } : g)),
        }));
      }
    } catch (error) {
      set({ error: `Failed to update goal: ${error}` });
    }
  },

  deleteGoal: async (goalId: string) => {
    try {
      const result = await window.electronAPI.improvement.deleteGoal(goalId);
      if (result.success) {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== goalId),
          selectedGoalId: state.selectedGoalId === goalId ? null : state.selectedGoalId,
        }));
      }
    } catch (error) {
      set({ error: `Failed to delete goal: ${error}` });
    }
  },

  abandonGoal: async (goalId: string) => {
    await get().updateGoal(goalId, { status: 'abandoned' });
  },

  // Loop actions
  startLoop: async (projectId: string, goalId: string) => {
    set({ activeLoopGoalId: goalId, loopIteration: 0, loopStatus: null, error: null });
    try {
      const result = await window.electronAPI.improvement.runLoop(projectId, goalId);
      if (result.success && result.data) {
        set({
          loopIteration: result.data.iterations,
          loopStatus: result.data.status,
        });
        // Refresh data after loop
        await get().loadAll(projectId);
      }
    } catch (error) {
      set({ error: `Loop failed: ${error}`, loopStatus: 'stalled' });
    } finally {
      set({ activeLoopGoalId: null });
    }
  },

  stopLoop: () => {
    window.electronAPI.improvement.stopLoop();
    set({ activeLoopGoalId: null, loopStatus: 'stalled' });
  },

  // Discovery actions
  runDiscovery: async (projectId: string, query?: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.improvement.discover(projectId, query);
      if (result.success && result.data) {
        set({ discoveries: result.data });
      }
    } catch (error) {
      set({ error: `Discovery failed: ${error}` });
    } finally {
      set({ isLoading: false });
    }
  },

  // UI actions
  selectGoal: (goalId: string | null) => {
    set({ selectedGoalId: goalId });
  },

  selectCard: (cardId: string | null) => {
    set({ selectedCardId: cardId });
  },

  setCardFilters: (filters: CardFilterOptions) => {
    set({ cardFilters: filters });
  },

  setGoalFilters: (filters: GoalFilterOptions) => {
    set({ goalFilters: filters });
  },

  clearError: () => {
    set({ error: null });
  },

  // Computed getters
  getFilteredCards: () => {
    const { cards, cardFilters } = get();
    return cards.filter((card) => {
      if (cardFilters.status?.length && !cardFilters.status.includes(card.status)) {
        return false;
      }
      if (cardFilters.type?.length && !cardFilters.type.includes(card.type)) {
        return false;
      }
      if (cardFilters.goalId && card.goal_id !== cardFilters.goalId) {
        return false;
      }
      return true;
    });
  },

  getFilteredGoals: () => {
    const { goals, goalFilters } = get();
    return goals.filter((goal) => {
      if (goalFilters.status?.length && !goalFilters.status.includes(goal.status)) {
        return false;
      }
      if (goalFilters.type?.length && !goalFilters.type.includes(goal.type)) {
        return false;
      }
      return true;
    });
  },

  getCardsForGoal: (goalId: string) => {
    return get().cards.filter((c) => c.goal_id === goalId);
  },

  getPendingCards: () => {
    return get().cards.filter((c) => c.status === 'proposed');
  },
}));

// Subscribe to IPC events
if (typeof window !== 'undefined' && window.electronAPI?.improvement) {
  // Listen for loop status updates
  window.electronAPI.improvement.onLoopStatus?.((status: LoopResult) => {
    useImprovementStore.setState({
      loopIteration: status.iterations,
      loopStatus: status.status,
    });
  });

  // Listen for cards updates
  window.electronAPI.improvement.onCardsUpdated?.((cards: ImprovementCard[]) => {
    useImprovementStore.setState({ cards });
  });

  // Listen for metrics updates
  window.electronAPI.improvement.onMetricsUpdated?.((metrics: ImprovementMetrics) => {
    useImprovementStore.setState({ metrics });
  });
}
