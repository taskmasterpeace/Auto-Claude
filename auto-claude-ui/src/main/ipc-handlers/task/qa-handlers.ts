/**
 * QA Question/Answer handlers
 *
 * Handles the QA clarifying question flow when the QA agent needs user input.
 * When QA encounters ambiguity, it can pause and ask a question. The user
 * answers, and QA resumes with the answer context.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'fs';
import path from 'path';
import { IPC_CHANNELS, getSpecsDir, AUTO_BUILD_PATHS } from '../../../shared/constants';
import type { IPCResult, QAQuestion } from '../../../shared/types';
import { findTaskAndProject } from './shared';
import { AgentManager } from '../../agent';

/**
 * Parse QA_QUESTION.md content into structured QAQuestion data
 */
function parseQAQuestion(content: string): Omit<QAQuestion, 'timestamp'> {
  const result: Omit<QAQuestion, 'timestamp'> = {
    context: '',
    question: '',
    reason: '',
    options: []
  };

  let currentSection: 'context' | 'question' | 'reason' | 'options' | null = null;
  const sectionContent: string[] = [];

  const saveSection = () => {
    if (!currentSection) return;
    const text = sectionContent.join('\n').trim();

    if (currentSection === 'options') {
      // Parse numbered list into options array
      const options: string[] = [];
      for (const line of sectionContent) {
        const trimmed = line.trim();
        // Match patterns like "1. Option", "2) Option", "- Option"
        if (trimmed && (trimmed[0].match(/[0-9-]/) !== null)) {
          // Remove leading number/bullet
          let cleaned = trimmed;
          for (const char of '0123456789.-) ') {
            if (cleaned && cleaned[0] === char) {
              cleaned = cleaned.slice(1);
            } else {
              break;
            }
          }
          cleaned = cleaned.trim();
          if (cleaned) {
            options.push(cleaned);
          }
        }
      }
      result.options = options;
    } else {
      result[currentSection] = text;
    }
  };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Detect section headers
    if (trimmed.startsWith('## Context')) {
      saveSection();
      currentSection = 'context';
      sectionContent.length = 0;
    } else if (trimmed.startsWith('## Question')) {
      saveSection();
      currentSection = 'question';
      sectionContent.length = 0;
    } else if (trimmed.startsWith('## Why') || trimmed.startsWith('## Reason')) {
      saveSection();
      currentSection = 'reason';
      sectionContent.length = 0;
    } else if (trimmed.startsWith('## Options')) {
      saveSection();
      currentSection = 'options';
      sectionContent.length = 0;
    } else if (trimmed.startsWith('# ')) {
      // Main title, skip
      continue;
    } else if (trimmed.startsWith('---')) {
      // Separator, skip
      continue;
    } else if (currentSection) {
      sectionContent.push(line);
    }
  }

  // Save final section
  saveSection();

  return result;
}

/**
 * Register QA question/answer handlers
 */
export function registerQAHandlers(
  agentManager: AgentManager,
  getMainWindow: () => BrowserWindow | null
): void {
  /**
   * Get pending QA question for a task
   */
  ipcMain.handle(
    IPC_CHANNELS.TASK_GET_QA_QUESTION,
    async (_, taskId: string): Promise<IPCResult<QAQuestion | null>> => {
      const { task, project } = findTaskAndProject(taskId);

      if (!task || !project) {
        return { success: false, error: 'Task not found' };
      }

      // Get the spec directory (could be in worktree or main project)
      const specsBaseDir = getSpecsDir(project.autoBuildPath);
      const worktreePath = path.join(project.path, '.worktrees', task.specId);
      const hasWorktree = existsSync(worktreePath);

      // Prefer worktree if it exists (where QA runs)
      const basePath = hasWorktree ? worktreePath : project.path;
      const specDir = path.join(basePath, specsBaseDir, task.specId);

      // Check for QA_QUESTION.md
      const questionFile = path.join(specDir, 'QA_QUESTION.md');

      if (!existsSync(questionFile)) {
        return { success: true, data: null };
      }

      try {
        const content = readFileSync(questionFile, 'utf-8');
        const parsed = parseQAQuestion(content);

        // Get timestamp from file stats
        const stats = statSync(questionFile);
        const timestamp = stats.mtime.toISOString();

        const question: QAQuestion = {
          ...parsed,
          timestamp
        };

        return { success: true, data: question };
      } catch (error) {
        console.error('[QA_GET_QUESTION] Error reading question file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to read question file'
        };
      }
    }
  );

  /**
   * Submit answer to QA question and resume QA validation
   */
  ipcMain.handle(
    IPC_CHANNELS.TASK_SUBMIT_QA_ANSWER,
    async (_, taskId: string, answer: string): Promise<IPCResult> => {
      const { task, project } = findTaskAndProject(taskId);

      if (!task || !project) {
        return { success: false, error: 'Task not found' };
      }

      if (!answer || !answer.trim()) {
        return { success: false, error: 'Answer cannot be empty' };
      }

      // Get the spec directory
      const specsBaseDir = getSpecsDir(project.autoBuildPath);
      const worktreePath = path.join(project.path, '.worktrees', task.specId);
      const hasWorktree = existsSync(worktreePath);

      // QA runs in worktree if it exists
      const basePath = hasWorktree ? worktreePath : project.path;
      const specDir = path.join(basePath, specsBaseDir, task.specId);

      // Write the answer file
      const answerFile = path.join(specDir, 'QA_ANSWER.md');
      const questionFile = path.join(specDir, 'QA_QUESTION.md');

      try {
        // Write answer
        const answerContent = `# Your Answer

${answer.trim()}

---
*Submitted at: ${new Date().toISOString()}*
`;
        writeFileSync(answerFile, answerContent);
        console.log('[QA_SUBMIT_ANSWER] Wrote answer file:', answerFile);

        // Update implementation_plan.json to clear question_pending status
        const planFile = path.join(specDir, AUTO_BUILD_PATHS.IMPLEMENTATION_PLAN);
        if (existsSync(planFile)) {
          try {
            const planContent = readFileSync(planFile, 'utf-8');
            const plan = JSON.parse(planContent);

            // Clear question_pending status - will be updated when QA resumes
            if (plan.qa_signoff && plan.qa_signoff.status === 'question_pending') {
              plan.qa_signoff.status = 'resuming';
              plan.qa_signoff.answer_received_at = new Date().toISOString();
              writeFileSync(planFile, JSON.stringify(plan, null, 2));
              console.log('[QA_SUBMIT_ANSWER] Updated implementation_plan.json status to resuming');
            }
          } catch (planError) {
            console.warn('[QA_SUBMIT_ANSWER] Could not update plan:', planError);
            // Non-critical, continue
          }
        }

        // Clean up question file (optional - QA will also clean it)
        if (existsSync(questionFile)) {
          try {
            unlinkSync(questionFile);
            console.log('[QA_SUBMIT_ANSWER] Cleaned up question file');
          } catch {
            // Non-critical if cleanup fails
          }
        }

        // Resume QA validation
        // Use the appropriate project path based on worktree existence
        console.log('[QA_SUBMIT_ANSWER] Resuming QA for task:', taskId);
        agentManager.resumeQAWithAnswer(taskId, basePath, task.specId);

        // Notify status change
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send(
            IPC_CHANNELS.TASK_STATUS_CHANGE,
            taskId,
            'in_progress'
          );
        }

        return { success: true };
      } catch (error) {
        console.error('[QA_SUBMIT_ANSWER] Error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to submit answer'
        };
      }
    }
  );
}
