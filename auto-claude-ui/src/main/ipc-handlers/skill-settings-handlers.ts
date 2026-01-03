import { ipcMain, shell } from 'electron';
import type { BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import os from 'os';
import { IPC_CHANNELS } from '../../shared/constants';
import type {
  IPCResult,
  LibrarySkill,
  SkillsLibraryResponse,
  ProjectSkillsResponse,
  EnabledSkillsConfig,
  LibrarySkillCategory
} from '../../shared/types';
import { projectStore } from '../project-store';
import { debugLogger } from '../utils/debug-logger';

// ============================================
// Skill Library Paths
// ============================================

/**
 * Get the path to the global skill library
 */
function getSkillLibraryPath(): string {
  return path.join(os.homedir(), '.claude', 'skill-library');
}

/**
 * Get the path to the skill library index
 */
function getSkillLibraryIndexPath(): string {
  return path.join(getSkillLibraryPath(), 'index.json');
}

/**
 * Get the path to enabled skills config for a project
 */
function getEnabledSkillsPath(projectPath: string): string {
  return path.join(projectPath, '.auto-claude', 'enabled_skills.json');
}

/**
 * Get the path to project skills directory
 */
function getProjectSkillsPath(projectPath: string): string {
  return path.join(projectPath, '.claude', 'skills');
}

// ============================================
// Skill Library Loading
// ============================================

interface SkillIndexEntry {
  name: string;
  description: string;
  source: string;
  path: string;
  tags: string[];
  tech_stack: string[];
  category: string;
}

interface SkillIndex {
  version: string;
  updated: string;
  skill_count: number;
  skills: SkillIndexEntry[];
}

/**
 * Load the skill library index
 */
function loadSkillLibraryIndex(): SkillIndex | null {
  const indexPath = getSkillLibraryIndexPath();

  if (!existsSync(indexPath)) {
    debugLogger.info('SkillSettingsHandlers', 'Skill library index not found', { indexPath });
    return null;
  }

  try {
    const content = readFileSync(indexPath, 'utf-8');
    return JSON.parse(content) as SkillIndex;
  } catch (error) {
    debugLogger.error('SkillSettingsHandlers', 'Failed to load skill library index', error, {
      indexPath
    });
    return null;
  }
}

/**
 * Convert index entry to LibrarySkill
 */
function indexEntryToLibrarySkill(entry: SkillIndexEntry): LibrarySkill {
  return {
    name: entry.name,
    description: entry.description,
    source: entry.source,
    path: entry.path,
    tags: entry.tags || [],
    techStack: entry.tech_stack || [],
    category: (entry.category || 'other') as LibrarySkillCategory
  };
}

/**
 * Load enabled skills config for a project
 */
function loadEnabledSkills(projectPath: string): string[] {
  const configPath = getEnabledSkillsPath(projectPath);

  if (!existsSync(configPath)) {
    return [];
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config: EnabledSkillsConfig = JSON.parse(content);
    return config.enabled || [];
  } catch (error) {
    debugLogger.error('SkillSettingsHandlers', 'Failed to load enabled skills', error, {
      configPath
    });
    return [];
  }
}

/**
 * Save enabled skills config for a project
 */
function saveEnabledSkills(projectPath: string, enabled: string[]): void {
  const configPath = getEnabledSkillsPath(projectPath);
  const dir = path.dirname(configPath);

  // Ensure .auto-claude directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const config: EnabledSkillsConfig = {
    version: '1.0',
    enabled
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  debugLogger.info('SkillSettingsHandlers', 'Saved enabled skills', {
    configPath,
    count: enabled.length
  });
}

/**
 * Load project-specific skills from .claude/skills/
 */
function loadProjectSkills(projectPath: string): LibrarySkill[] {
  const skillsDir = getProjectSkillsPath(projectPath);

  if (!existsSync(skillsDir)) {
    return [];
  }

  const skills: LibrarySkill[] = [];

  try {
    const dirs = readdirSync(skillsDir, { withFileTypes: true });

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const skillPath = path.join(skillsDir, dir.name, 'SKILL.md');
      if (!existsSync(skillPath)) continue;

      try {
        const content = readFileSync(skillPath, 'utf-8');
        const { name, description } = parseSkillFrontmatter(content, dir.name);

        skills.push({
          name,
          description,
          source: 'project',
          path: `project/${dir.name}/SKILL.md`,
          tags: [],
          techStack: [],
          category: 'project'
        });
      } catch (err) {
        debugLogger.error('SkillSettingsHandlers', 'Failed to parse project skill', err, {
          skillPath
        });
      }
    }
  } catch (error) {
    debugLogger.error('SkillSettingsHandlers', 'Failed to load project skills', error, {
      skillsDir
    });
  }

  return skills;
}

/**
 * Parse SKILL.md frontmatter
 */
function parseSkillFrontmatter(
  content: string,
  defaultName: string
): { name: string; description: string } {
  let name = defaultName;
  let description = '';

  if (content.startsWith('---')) {
    const parts = content.split('---', 3);
    if (parts.length >= 2) {
      const frontmatter = parts[1];
      for (const line of frontmatter.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('name:')) {
          name = trimmed.slice(5).trim().replace(/^["']|["']$/g, '');
        } else if (trimmed.startsWith('description:')) {
          description = trimmed.slice(12).trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }

  return { name, description };
}

/**
 * Create a new skill from template
 */
function createSkillFromTemplate(projectPath: string, skillName: string): string {
  const skillsDir = getProjectSkillsPath(projectPath);
  const skillDir = path.join(skillsDir, skillName);
  const skillPath = path.join(skillDir, 'SKILL.md');

  // Ensure directory exists
  if (!existsSync(skillDir)) {
    mkdirSync(skillDir, { recursive: true });
  }

  // Create template
  const template = `---
name: ${skillName}
description: What this skill does and when to use it
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# ${skillName}

## When to Use
[Describe when agents should apply this skill]

## Guidelines
- Guideline 1
- Guideline 2

## Examples
[Show example usage]
`;

  writeFileSync(skillPath, template, 'utf-8');
  debugLogger.info('SkillSettingsHandlers', 'Created skill from template', { skillPath });

  return skillPath;
}

// ============================================
// IPC Handlers
// ============================================

/**
 * Register all skill settings IPC handlers
 */
export function registerSkillSettingsHandlers(
  _getMainWindow: () => BrowserWindow | null
): void {
  // Get all library skills organized by category
  ipcMain.handle(
    IPC_CHANNELS.SKILLS_GET_LIBRARY,
    async (): Promise<IPCResult<SkillsLibraryResponse>> => {
      debugLogger.enter('SkillSettingsHandlers', 'SKILLS_GET_LIBRARY');

      const index = loadSkillLibraryIndex();

      if (!index) {
        debugLogger.info('SkillSettingsHandlers', 'No skill library found');
        return {
          success: true,
          data: {
            byCategory: {},
            totalCount: 0,
            hasLibrary: false
          }
        };
      }

      // Group skills by category
      const byCategory: Record<string, LibrarySkill[]> = {};

      for (const entry of index.skills) {
        const skill = indexEntryToLibrarySkill(entry);
        const category = skill.category || 'other';

        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category].push(skill);
      }

      // Sort skills within each category by name
      for (const category of Object.keys(byCategory)) {
        byCategory[category].sort((a, b) => a.name.localeCompare(b.name));
      }

      debugLogger.exit('SkillSettingsHandlers', 'SKILLS_GET_LIBRARY', {
        success: true,
        totalCount: index.skill_count,
        categories: Object.keys(byCategory).length
      });

      return {
        success: true,
        data: {
          byCategory,
          totalCount: index.skill_count,
          hasLibrary: true
        }
      };
    }
  );

  // Get enabled skills for a project
  ipcMain.handle(
    IPC_CHANNELS.SKILLS_GET_ENABLED,
    async (_, projectId: string): Promise<IPCResult<string[]>> => {
      debugLogger.enter('SkillSettingsHandlers', 'SKILLS_GET_ENABLED', { projectId });

      const project = projectStore.getProject(projectId);
      if (!project) {
        debugLogger.error('SkillSettingsHandlers', 'Project not found', null, { projectId });
        return { success: false, error: 'Project not found' };
      }

      const enabled = loadEnabledSkills(project.path);

      debugLogger.exit('SkillSettingsHandlers', 'SKILLS_GET_ENABLED', {
        success: true,
        count: enabled.length
      });

      return { success: true, data: enabled };
    }
  );

  // Update enabled skills for a project
  ipcMain.handle(
    IPC_CHANNELS.SKILLS_SET_ENABLED,
    async (_, projectId: string, enabled: string[]): Promise<IPCResult<void>> => {
      debugLogger.enter('SkillSettingsHandlers', 'SKILLS_SET_ENABLED', {
        projectId,
        count: enabled.length
      });

      const project = projectStore.getProject(projectId);
      if (!project) {
        debugLogger.error('SkillSettingsHandlers', 'Project not found', null, { projectId });
        return { success: false, error: 'Project not found' };
      }

      try {
        saveEnabledSkills(project.path, enabled);

        debugLogger.exit('SkillSettingsHandlers', 'SKILLS_SET_ENABLED', { success: true });
        return { success: true, data: undefined };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to save enabled skills';
        debugLogger.error('SkillSettingsHandlers', 'Error saving enabled skills', error);
        return { success: false, error: errorMsg };
      }
    }
  );

  // Get project-specific skills
  ipcMain.handle(
    IPC_CHANNELS.SKILLS_GET_PROJECT,
    async (_, projectId: string): Promise<IPCResult<ProjectSkillsResponse>> => {
      debugLogger.enter('SkillSettingsHandlers', 'SKILLS_GET_PROJECT', { projectId });

      const project = projectStore.getProject(projectId);
      if (!project) {
        debugLogger.error('SkillSettingsHandlers', 'Project not found', null, { projectId });
        return { success: false, error: 'Project not found' };
      }

      const skills = loadProjectSkills(project.path);

      debugLogger.exit('SkillSettingsHandlers', 'SKILLS_GET_PROJECT', {
        success: true,
        count: skills.length
      });

      return { success: true, data: { skills } };
    }
  );

  // Open skill in editor (create if needed)
  ipcMain.handle(
    IPC_CHANNELS.SKILLS_OPEN_IN_EDITOR,
    async (_, projectId: string, skillName: string): Promise<IPCResult<string>> => {
      debugLogger.enter('SkillSettingsHandlers', 'SKILLS_OPEN_IN_EDITOR', {
        projectId,
        skillName
      });

      const project = projectStore.getProject(projectId);
      if (!project) {
        debugLogger.error('SkillSettingsHandlers', 'Project not found', null, { projectId });
        return { success: false, error: 'Project not found' };
      }

      try {
        // Check if skill already exists
        const skillsDir = getProjectSkillsPath(project.path);
        const skillPath = path.join(skillsDir, skillName, 'SKILL.md');

        let filePath: string;
        if (existsSync(skillPath)) {
          filePath = skillPath;
        } else {
          // Create from template
          filePath = createSkillFromTemplate(project.path, skillName);
        }

        // Open in default editor
        await shell.openPath(filePath);

        debugLogger.exit('SkillSettingsHandlers', 'SKILLS_OPEN_IN_EDITOR', {
          success: true,
          filePath
        });

        return { success: true, data: filePath };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to open skill';
        debugLogger.error('SkillSettingsHandlers', 'Error opening skill', error);
        return { success: false, error: errorMsg };
      }
    }
  );

  debugLogger.info('SkillSettingsHandlers', 'All skill settings handlers registered');
}
