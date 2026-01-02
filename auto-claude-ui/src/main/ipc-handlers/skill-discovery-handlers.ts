import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { spawn } from 'child_process';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult, SkillSuggestion } from '../../shared/types';
import { projectStore } from '../project-store';
import { debugLogger } from '../utils/debug-logger';
import type { PythonEnvManager } from '../python-env-manager';

/**
 * Get the path to the dismissed skills file for a project
 */
function getDismissedSkillsPath(projectPath: string): string {
  return path.join(projectPath, '.auto-claude', 'dismissed_skills.json');
}

/**
 * Load dismissed skills for a project
 */
function loadDismissedSkills(projectPath: string): string[] {
  const dismissedPath = getDismissedSkillsPath(projectPath);
  if (!existsSync(dismissedPath)) {
    return [];
  }

  try {
    const content = readFileSync(dismissedPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    debugLogger.error('SkillDiscoveryHandlers', 'Failed to load dismissed skills', error, {
      path: dismissedPath
    });
    return [];
  }
}

/**
 * Save dismissed skills for a project
 */
function saveDismissedSkills(projectPath: string, dismissedSkills: string[]): void {
  const dismissedPath = getDismissedSkillsPath(projectPath);
  const dir = path.dirname(dismissedPath);

  // Ensure .auto-claude directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(dismissedPath, JSON.stringify(dismissedSkills, null, 2), 'utf-8');
  debugLogger.info('SkillDiscoveryHandlers', 'Saved dismissed skills', {
    path: dismissedPath,
    count: dismissedSkills.length
  });
}

/**
 * Run skill discovery Python script
 */
async function runSkillDiscovery(
  projectPath: string,
  autoBuildSourcePath: string,
  pythonPath: string
): Promise<SkillSuggestion[]> {
  debugLogger.enter('SkillDiscoveryHandlers', 'runSkillDiscovery', {
    projectPath,
    autoBuildSourcePath,
    pythonPath
  });

  return new Promise((resolve, reject) => {
    // Call the skill discovery module from auto-claude directory
    const proc = spawn(pythonPath, [
      '-m',
      'skills.skill_discovery',
      '--project-dir',
      projectPath,
      '--output-json'
    ], {
      cwd: autoBuildSourcePath, // Run from auto-claude directory where skills module exists
      env: { ...process.env },
      shell: true // Use shell on Windows to handle Python PATH
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number) => {
      if (code === 0) {
        try {
          // Parse JSON output
          const suggestions: SkillSuggestion[] = JSON.parse(stdout);
          debugLogger.info('SkillDiscoveryHandlers', 'Skill discovery completed successfully', {
            count: suggestions.length
          });
          debugLogger.exit('SkillDiscoveryHandlers', 'runSkillDiscovery', {
            success: true,
            count: suggestions.length
          });
          resolve(suggestions);
        } catch (error) {
          debugLogger.error('SkillDiscoveryHandlers', 'Failed to parse skill discovery output', error, {
            stdout
          });
          reject(new Error('Failed to parse skill discovery output'));
        }
      } else {
        debugLogger.error('SkillDiscoveryHandlers', 'Skill discovery exited with error code', null, {
          code,
          stderr
        });
        debugLogger.exit('SkillDiscoveryHandlers', 'runSkillDiscovery', {
          success: false,
          code
        });
        reject(new Error(`Skill discovery exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (error) => {
      debugLogger.error('SkillDiscoveryHandlers', 'Skill discovery process error', error);
      debugLogger.exit('SkillDiscoveryHandlers', 'runSkillDiscovery', {
        success: false,
        error: error.message
      });
      reject(error);
    });
  });
}

/**
 * Register all skill discovery IPC handlers
 */
export function registerSkillDiscoveryHandlers(
  pythonEnvManager: PythonEnvManager,
  _getMainWindow: () => BrowserWindow | null
): void {
  // Discover skills for a project
  ipcMain.handle(
    IPC_CHANNELS.SKILLS_DISCOVER,
    async (_, projectId: string): Promise<IPCResult<SkillSuggestion[]>> => {
      debugLogger.enter('SkillDiscoveryHandlers', 'SKILLS_DISCOVER', { projectId });

      const project = projectStore.getProject(projectId);
      if (!project) {
        debugLogger.error('SkillDiscoveryHandlers', 'Project not found in store', null, { projectId });
        return { success: false, error: 'Project not found' };
      }

      debugLogger.info('SkillDiscoveryHandlers', 'Discovering skills for project', {
        projectId,
        projectPath: project.path
      });

      try {
        // Get Python environment info
        const envStatus = await pythonEnvManager.getStatus();
        if (!envStatus.ready || !envStatus.pythonPath) {
          const errorMsg = 'Python environment not ready';
          debugLogger.error('SkillDiscoveryHandlers', errorMsg, null, { envStatus });
          return { success: false, error: errorMsg };
        }

        // Get auto-claude source path from pythonEnvManager
        const autoBuildSourcePath = pythonEnvManager.getAutoBuildSourcePath();
        if (!autoBuildSourcePath) {
          const errorMsg = 'Auto-Claude source path not configured';
          debugLogger.error('SkillDiscoveryHandlers', errorMsg);
          return { success: false, error: errorMsg };
        }

        const suggestions = await runSkillDiscovery(
          project.path,
          autoBuildSourcePath,
          envStatus.pythonPath
        );
        debugLogger.info('SkillDiscoveryHandlers', 'Skill discovery successful', {
          suggestionsCount: suggestions.length
        });
        debugLogger.exit('SkillDiscoveryHandlers', 'SKILLS_DISCOVER', {
          success: true,
          count: suggestions.length
        });
        return { success: true, data: suggestions };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to discover skills';
        debugLogger.error('SkillDiscoveryHandlers', 'Error discovering skills', error);
        debugLogger.exit('SkillDiscoveryHandlers', 'SKILLS_DISCOVER', {
          success: false,
          error: errorMsg
        });
        return {
          success: false,
          error: errorMsg
        };
      }
    }
  );

  // Create skill from suggestion
  ipcMain.handle(
    IPC_CHANNELS.SKILLS_CREATE,
    async (_, projectId: string, suggestion: SkillSuggestion): Promise<IPCResult<void>> => {
      debugLogger.enter('SkillDiscoveryHandlers', 'SKILLS_CREATE', {
        projectId,
        skillName: suggestion.name
      });

      const project = projectStore.getProject(projectId);
      if (!project) {
        debugLogger.error('SkillDiscoveryHandlers', 'Project not found in store', null, { projectId });
        return { success: false, error: 'Project not found' };
      }

      const skillsBaseDir = path.join(project.path, '.claude', 'skills');
      const skillDir = path.join(skillsBaseDir, suggestion.name);
      const skillFilePath = path.join(skillDir, 'SKILL.md');

      debugLogger.info('SkillDiscoveryHandlers', 'Creating skill', {
        skillName: suggestion.name,
        skillDir,
        skillFilePath
      });

      try {
        // Create skill directory
        if (!existsSync(skillDir)) {
          mkdirSync(skillDir, { recursive: true });
          debugLogger.info('SkillDiscoveryHandlers', 'Created skill directory', { skillDir });
        }

        // Write SKILL.md
        writeFileSync(skillFilePath, suggestion.skill_template, 'utf-8');
        debugLogger.info('SkillDiscoveryHandlers', 'Created SKILL.md file', { skillFilePath });

        debugLogger.exit('SkillDiscoveryHandlers', 'SKILLS_CREATE', { success: true });
        return { success: true, data: undefined };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to create skill';
        debugLogger.error('SkillDiscoveryHandlers', 'Error creating skill', error, {
          skillName: suggestion.name,
          skillDir
        });
        debugLogger.exit('SkillDiscoveryHandlers', 'SKILLS_CREATE', {
          success: false,
          error: errorMsg
        });
        return {
          success: false,
          error: errorMsg
        };
      }
    }
  );

  // Dismiss skill suggestion
  ipcMain.handle(
    IPC_CHANNELS.SKILLS_DISMISS,
    async (_, projectId: string, skillName: string): Promise<IPCResult<void>> => {
      debugLogger.enter('SkillDiscoveryHandlers', 'SKILLS_DISMISS', {
        projectId,
        skillName
      });

      const project = projectStore.getProject(projectId);
      if (!project) {
        debugLogger.error('SkillDiscoveryHandlers', 'Project not found in store', null, { projectId });
        return { success: false, error: 'Project not found' };
      }

      debugLogger.info('SkillDiscoveryHandlers', 'Dismissing skill suggestion', {
        projectId,
        skillName,
        projectPath: project.path
      });

      try {
        // Load existing dismissed skills
        const dismissedSkills = loadDismissedSkills(project.path);

        // Add to dismissed list if not already there
        if (!dismissedSkills.includes(skillName)) {
          dismissedSkills.push(skillName);
          saveDismissedSkills(project.path, dismissedSkills);
          debugLogger.info('SkillDiscoveryHandlers', 'Skill dismissed', {
            skillName,
            totalDismissed: dismissedSkills.length
          });
        } else {
          debugLogger.info('SkillDiscoveryHandlers', 'Skill already dismissed', { skillName });
        }

        debugLogger.exit('SkillDiscoveryHandlers', 'SKILLS_DISMISS', { success: true });
        return { success: true, data: undefined };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to dismiss skill';
        debugLogger.error('SkillDiscoveryHandlers', 'Error dismissing skill', error, {
          skillName
        });
        debugLogger.exit('SkillDiscoveryHandlers', 'SKILLS_DISMISS', {
          success: false,
          error: errorMsg
        });
        return {
          success: false,
          error: errorMsg
        };
      }
    }
  );

  debugLogger.info('SkillDiscoveryHandlers', 'All skill discovery handlers registered');
}
