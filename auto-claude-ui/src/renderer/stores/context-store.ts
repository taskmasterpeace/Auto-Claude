import { create } from 'zustand';
import type {
  ProjectIndex,
  GraphitiMemoryStatus,
  GraphitiMemoryState,
  MemoryEpisode,
  ContextSearchResult
} from '../../shared/types';

interface ContextState {
  // Project Index
  projectIndex: ProjectIndex | null;
  indexLoading: boolean;
  indexError: string | null;

  // Memory Status
  memoryStatus: GraphitiMemoryStatus | null;
  memoryState: GraphitiMemoryState | null;
  memoryLoading: boolean;
  memoryError: string | null;

  // Recent Memories
  recentMemories: MemoryEpisode[];
  memoriesLoading: boolean;

  // Search
  searchResults: ContextSearchResult[];
  searchLoading: boolean;
  searchQuery: string;

  // Actions
  setProjectIndex: (index: ProjectIndex | null) => void;
  setIndexLoading: (loading: boolean) => void;
  setIndexError: (error: string | null) => void;
  setMemoryStatus: (status: GraphitiMemoryStatus | null) => void;
  setMemoryState: (state: GraphitiMemoryState | null) => void;
  setMemoryLoading: (loading: boolean) => void;
  setMemoryError: (error: string | null) => void;
  setRecentMemories: (memories: MemoryEpisode[]) => void;
  setMemoriesLoading: (loading: boolean) => void;
  setSearchResults: (results: ContextSearchResult[]) => void;
  setSearchLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearAll: () => void;
}

export const useContextStore = create<ContextState>((set) => ({
  // Project Index
  projectIndex: null,
  indexLoading: false,
  indexError: null,

  // Memory Status
  memoryStatus: null,
  memoryState: null,
  memoryLoading: false,
  memoryError: null,

  // Recent Memories
  recentMemories: [],
  memoriesLoading: false,

  // Search
  searchResults: [],
  searchLoading: false,
  searchQuery: '',

  // Actions
  setProjectIndex: (index) => set({ projectIndex: index }),
  setIndexLoading: (loading) => set({ indexLoading: loading }),
  setIndexError: (error) => set({ indexError: error }),
  setMemoryStatus: (status) => set({ memoryStatus: status }),
  setMemoryState: (state) => set({ memoryState: state }),
  setMemoryLoading: (loading) => set({ memoryLoading: loading }),
  setMemoryError: (error) => set({ memoryError: error }),
  setRecentMemories: (memories) => set({ recentMemories: memories }),
  setMemoriesLoading: (loading) => set({ memoriesLoading: loading }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchLoading: (loading) => set({ searchLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearAll: () =>
    set({
      projectIndex: null,
      indexLoading: false,
      indexError: null,
      memoryStatus: null,
      memoryState: null,
      memoryLoading: false,
      memoryError: null,
      recentMemories: [],
      memoriesLoading: false,
      searchResults: [],
      searchLoading: false,
      searchQuery: ''
    })
}));

/**
 * Load project context (project index + memory status)
 */
export async function loadProjectContext(projectId: string): Promise<void> {
  const store = useContextStore.getState();
  store.setIndexLoading(true);
  store.setMemoryLoading(true);
  store.setIndexError(null);
  store.setMemoryError(null);

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
    });

    const result = await Promise.race([
      window.electronAPI.getProjectContext(projectId),
      timeoutPromise
    ]);

    if (result.success && result.data) {
      store.setProjectIndex(result.data.projectIndex);
      store.setMemoryStatus(result.data.memoryStatus);
      store.setMemoryState(result.data.memoryState);
      store.setRecentMemories(result.data.recentMemories || []);

      // If there's a warning/partial error, show it
      if (result.error) {
        store.setIndexError(result.error);
      }
    } else {
      // Better error messages
      let errorMsg = result.error || 'Failed to load project context';

      // Add helpful context based on common errors
      if (errorMsg.includes('Project not found')) {
        errorMsg += '. The project may not be registered in Auto-Claude.';
      } else if (errorMsg.includes('project_index.json')) {
        errorMsg += ' Click "Analyze Project" to generate the index.';
      } else if (errorMsg.includes('permission')) {
        errorMsg += ' Check file permissions for the project directory.';
      }

      store.setIndexError(errorMsg);
    }
  } catch (error) {
    let errorMsg = 'Failed to load project context';

    if (error instanceof Error) {
      errorMsg = error.message;

      // Add context for timeout errors
      if (errorMsg.includes('timed out')) {
        errorMsg += '. This may indicate a problem with the backend or file system access.';
      }
    }

    store.setIndexError(errorMsg);
    console.error('[Context Store] Error loading project context:', error);
  } finally {
    store.setIndexLoading(false);
    store.setMemoryLoading(false);
  }
}

/**
 * Refresh project index by re-running analyzer
 */
export async function refreshProjectIndex(projectId: string): Promise<void> {
  const store = useContextStore.getState();
  store.setIndexLoading(true);
  store.setIndexError(null);

  try {
    const result = await window.electronAPI.refreshProjectIndex(projectId);
    if (result.success && result.data) {
      store.setProjectIndex(result.data);
    } else {
      store.setIndexError(result.error || 'Failed to refresh project index');
    }
  } catch (error) {
    store.setIndexError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    store.setIndexLoading(false);
  }
}

/**
 * Search memories using semantic search
 */
export async function searchMemories(
  projectId: string,
  query: string
): Promise<void> {
  const store = useContextStore.getState();
  store.setSearchQuery(query);

  if (!query.trim()) {
    store.setSearchResults([]);
    return;
  }

  store.setSearchLoading(true);

  try {
    const result = await window.electronAPI.searchMemories(projectId, query);
    if (result.success && result.data) {
      store.setSearchResults(result.data);
    } else {
      store.setSearchResults([]);
    }
  } catch (_error) {
    store.setSearchResults([]);
  } finally {
    store.setSearchLoading(false);
  }
}

/**
 * Load recent memories
 */
export async function loadRecentMemories(
  projectId: string,
  limit: number = 20
): Promise<void> {
  const store = useContextStore.getState();
  store.setMemoriesLoading(true);

  try {
    const result = await window.electronAPI.getRecentMemories(projectId, limit);
    if (result.success && result.data) {
      store.setRecentMemories(result.data);
    }
  } catch (_error) {
    // Silently fail - memories are optional
  } finally {
    store.setMemoriesLoading(false);
  }
}
