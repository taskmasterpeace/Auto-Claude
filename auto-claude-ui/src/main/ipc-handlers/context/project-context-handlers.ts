import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { spawn } from 'child_process';
import { IPC_CHANNELS, getSpecsDir, AUTO_BUILD_PATHS } from '../../../shared/constants';
import type {
  IPCResult,
  ProjectContextData,
  ProjectIndex,
  MemoryEpisode
} from '../../../shared/types';
import { projectStore } from '../../project-store';
import { getFalkorDBService } from '../../falkordb-service';
import {
  getAutoBuildSourcePath
} from './utils';
import {
  loadGraphitiStateFromSpecs,
  buildMemoryStatus
} from './memory-status-handlers';
import { loadFileBasedMemories } from './memory-data-handlers';
import { debugLogger } from '../../utils/debug-logger';

/**
 * Load project index from file
 */
function loadProjectIndex(projectPath: string): ProjectIndex | null {
  debugLogger.enter('ProjectContextHandlers', 'loadProjectIndex', { projectPath });

  const indexPath = path.join(projectPath, AUTO_BUILD_PATHS.PROJECT_INDEX);
  debugLogger.debug('ProjectContextHandlers', 'Checking project index path', { indexPath });

  if (!existsSync(indexPath)) {
    debugLogger.warn('ProjectContextHandlers', 'Project index file does not exist', { indexPath });
    return null;
  }

  try {
    const content = readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(content);
    debugLogger.info('ProjectContextHandlers', 'Successfully loaded project index', {
      indexPath,
      servicesCount: index.services?.length || 0
    });
    debugLogger.exit('ProjectContextHandlers', 'loadProjectIndex', { success: true });
    return index;
  } catch (error) {
    debugLogger.error('ProjectContextHandlers', 'Failed to parse project index', error, { indexPath });
    debugLogger.exit('ProjectContextHandlers', 'loadProjectIndex', { success: false });
    return null;
  }
}

/**
 * Load recent memories with FalkorDB fallback
 */
async function loadRecentMemories(
  projectPath: string,
  autoBuildPath: string | undefined,
  memoryStatusAvailable: boolean,
  memoryHost?: string,
  memoryPort?: number
): Promise<MemoryEpisode[]> {
  debugLogger.enter('ProjectContextHandlers', 'loadRecentMemories', {
    projectPath,
    memoryStatusAvailable,
    memoryHost,
    memoryPort
  });

  let recentMemories: MemoryEpisode[] = [];

  // Try to load from FalkorDB first if Graphiti is available
  if (memoryStatusAvailable && memoryHost && memoryPort) {
    try {
      debugLogger.info('ProjectContextHandlers', 'Attempting to load memories from FalkorDB', {
        host: memoryHost,
        port: memoryPort
      });
      const falkorService = getFalkorDBService({
        host: memoryHost,
        port: memoryPort,
      });
      const falkorMemories = await falkorService.getAllMemories(20);
      if (falkorMemories.length > 0) {
        debugLogger.info('ProjectContextHandlers', 'Loaded memories from FalkorDB', {
          count: falkorMemories.length
        });
        recentMemories = falkorMemories;
      } else {
        debugLogger.info('ProjectContextHandlers', 'No memories found in FalkorDB');
      }
    } catch (error) {
      debugLogger.error('ProjectContextHandlers', 'Failed to load memories from FalkorDB, falling back to file-based', error);
    }
  } else {
    debugLogger.info('ProjectContextHandlers', 'Skipping FalkorDB, memory status not available or connection details missing');
  }

  // Fall back to file-based memory if no FalkorDB memories found
  if (recentMemories.length === 0) {
    const specsBaseDir = getSpecsDir(autoBuildPath);
    const specsDir = path.join(projectPath, specsBaseDir);
    debugLogger.info('ProjectContextHandlers', 'Loading file-based memories', { specsDir });
    recentMemories = loadFileBasedMemories(specsDir, 20);
    debugLogger.info('ProjectContextHandlers', 'Loaded file-based memories', { count: recentMemories.length });
  }

  debugLogger.exit('ProjectContextHandlers', 'loadRecentMemories', { count: recentMemories.length });
  return recentMemories;
}

/**
 * Register project context handlers
 */
export function registerProjectContextHandlers(
  _getMainWindow: () => BrowserWindow | null
): void {
  // Get full project context
  ipcMain.handle(
    IPC_CHANNELS.CONTEXT_GET,
    async (_, projectId: string): Promise<IPCResult<ProjectContextData>> => {
      debugLogger.enter('ProjectContextHandlers', 'CONTEXT_GET', { projectId });

      const project = projectStore.getProject(projectId);
      if (!project) {
        debugLogger.error('ProjectContextHandlers', 'Project not found in store', null, { projectId });
        return { success: false, error: 'Project not found' };
      }

      debugLogger.info('ProjectContextHandlers', 'Loading context for project', {
        projectId,
        projectPath: project.path,
        autoBuildPath: project.autoBuildPath
      });

      let projectIndex = null;
      let memoryState = null;
      let memoryStatus = null;
      let recentMemories: MemoryEpisode[] = [];
      const errors: string[] = [];

      // Load project index (don't fail entire operation if this fails)
      try {
        debugLogger.info('ProjectContextHandlers', 'Loading project index...');
        projectIndex = loadProjectIndex(project.path);
        if (!projectIndex) {
          const indexPath = path.join(project.path, AUTO_BUILD_PATHS.PROJECT_INDEX);
          errors.push(`Project index not found at: ${indexPath}`);
          debugLogger.warn('ProjectContextHandlers', 'No project index found', { indexPath });
        }
      } catch (error) {
        const errorMsg = `Failed to load project index: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        debugLogger.error('ProjectContextHandlers', 'Error loading project index', error);
      }

      // Load graphiti state from most recent spec
      try {
        debugLogger.info('ProjectContextHandlers', 'Loading graphiti state from specs...');
        memoryState = loadGraphitiStateFromSpecs(project.path, project.autoBuildPath);
        debugLogger.info('ProjectContextHandlers', 'Graphiti state loaded', { hasState: !!memoryState });
      } catch (error) {
        debugLogger.error('ProjectContextHandlers', 'Error loading graphiti state', error);
        // Don't add to errors - this is optional
      }

      // Build memory status
      try {
        debugLogger.info('ProjectContextHandlers', 'Building memory status...');
        memoryStatus = buildMemoryStatus(
          project.path,
          project.autoBuildPath,
          memoryState
        );
        debugLogger.info('ProjectContextHandlers', 'Memory status built', {
          available: memoryStatus.available,
          enabled: memoryStatus.enabled
        });
      } catch (error) {
        debugLogger.error('ProjectContextHandlers', 'Error building memory status', error);
        // Don't add to errors - this is optional
      }

      // Load recent memories
      try {
        debugLogger.info('ProjectContextHandlers', 'Loading recent memories...');
        recentMemories = await loadRecentMemories(
          project.path,
          project.autoBuildPath,
          memoryStatus?.available || false,
          memoryStatus?.host,
          memoryStatus?.port
        );
        debugLogger.info('ProjectContextHandlers', 'Recent memories loaded', { count: recentMemories.length });
      } catch (error) {
        debugLogger.error('ProjectContextHandlers', 'Error loading recent memories', error);
        // Don't add to errors - this is optional
      }

      const result: {
        success: boolean;
        data: {
          projectIndex: typeof projectIndex;
          memoryStatus: typeof memoryStatus;
          memoryState: typeof memoryState;
          recentMemories: typeof recentMemories;
          isLoading: boolean;
        };
        error?: string;
      } = {
        success: true,
        data: {
          projectIndex,
          memoryStatus,
          memoryState,
          recentMemories,
          isLoading: false
        }
      };

      // If we have errors but still got some data, add a warning note
      if (errors.length > 0) {
        debugLogger.warn('ProjectContextHandlers', 'Context loaded with errors', { errors });
        result.error = errors.join('. ');
      }

      debugLogger.exit('ProjectContextHandlers', 'CONTEXT_GET', {
        success: result.success,
        hasProjectIndex: !!projectIndex,
        hasMemoryStatus: !!memoryStatus,
        memoriesCount: recentMemories.length,
        errors: errors.length
      });

      return result;
    }
  );

  // Refresh project index
  ipcMain.handle(
    IPC_CHANNELS.CONTEXT_REFRESH_INDEX,
    async (_, projectId: string): Promise<IPCResult<ProjectIndex>> => {
      debugLogger.enter('ProjectContextHandlers', 'CONTEXT_REFRESH_INDEX', { projectId });

      const project = projectStore.getProject(projectId);
      if (!project) {
        debugLogger.error('ProjectContextHandlers', 'Project not found in store', null, { projectId });
        return { success: false, error: 'Project not found' };
      }

      debugLogger.info('ProjectContextHandlers', 'Refreshing project index', {
        projectId,
        projectPath: project.path
      });

      try {
        // Run the analyzer script to regenerate project_index.json
        const autoBuildSource = getAutoBuildSourcePath();

        if (!autoBuildSource) {
          debugLogger.error('ProjectContextHandlers', 'Auto-build source path not configured');
          return {
            success: false,
            error: 'Auto-build source path not configured'
          };
        }

        const analyzerPath = path.join(autoBuildSource, 'analyzer.py');
        const indexOutputPath = path.join(project.path, AUTO_BUILD_PATHS.PROJECT_INDEX);

        debugLogger.info('ProjectContextHandlers', 'Running analyzer script', {
          analyzerPath,
          indexOutputPath,
          projectPath: project.path
        });

        // Run analyzer
        await new Promise<void>((resolve, reject) => {
          const proc = spawn('python', [
            analyzerPath,
            '--project-dir', project.path,
            '--output', indexOutputPath
          ], {
            cwd: project.path,
            env: { ...process.env }
          });

          let stderr = '';
          proc.stderr?.on('data', (data) => {
            stderr += data.toString();
          });

          proc.on('close', (code: number) => {
            if (code === 0) {
              debugLogger.info('ProjectContextHandlers', 'Analyzer completed successfully');
              resolve();
            } else {
              debugLogger.error('ProjectContextHandlers', 'Analyzer exited with error code', null, {
                code,
                stderr
              });
              reject(new Error(`Analyzer exited with code ${code}`));
            }
          });

          proc.on('error', (error) => {
            debugLogger.error('ProjectContextHandlers', 'Analyzer process error', error);
            reject(error);
          });
        });

        // Read the new index
        const projectIndex = loadProjectIndex(project.path);
        if (projectIndex) {
          debugLogger.info('ProjectContextHandlers', 'Project index refreshed successfully');
          debugLogger.exit('ProjectContextHandlers', 'CONTEXT_REFRESH_INDEX', { success: true });
          return { success: true, data: projectIndex };
        }

        debugLogger.error('ProjectContextHandlers', 'Project index file not found after analyzer run', null, {
          indexOutputPath
        });
        return { success: false, error: 'Failed to generate project index' };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to refresh project index';
        debugLogger.error('ProjectContextHandlers', 'Error refreshing project index', error);
        debugLogger.exit('ProjectContextHandlers', 'CONTEXT_REFRESH_INDEX', { success: false, error: errorMsg });
        return {
          success: false,
          error: errorMsg
        };
      }
    }
  );

  // Get log file path
  ipcMain.handle(
    IPC_CHANNELS.CONTEXT_GET_LOG_PATH,
    (): Promise<IPCResult<string>> => {
      try {
        const logPath = debugLogger.getLogFilePath();
        debugLogger.debug('ProjectContextHandlers', 'Log path requested', { logPath });
        return Promise.resolve({ success: true, data: logPath });
      } catch (error) {
        debugLogger.error('ProjectContextHandlers', 'Failed to get log path', error);
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get log path'
        });
      }
    }
  );

  // Open logs directory
  ipcMain.handle(
    IPC_CHANNELS.CONTEXT_OPEN_LOGS,
    async (): Promise<IPCResult<void>> => {
      try {
        const { shell } = await import('electron');
        const logPath = debugLogger.getLogFilePath();
        debugLogger.info('ProjectContextHandlers', 'Opening logs directory', { logPath });
        await shell.showItemInFolder(logPath);
        return { success: true, data: undefined };
      } catch (error) {
        debugLogger.error('ProjectContextHandlers', 'Failed to open logs directory', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to open logs directory'
        };
      }
    }
  );
}
