/**
 * Revenue System IPC Handlers
 *
 * Handles communication between UI and Python revenue system backend
 * - BMAD spec building (interactive & automated)
 * - Revenue tracking
 * - Opportunity analysis
 */

import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export interface BMADCategory {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  answers: Record<string, any>;
}

export interface BMADSpec {
  metadata: {
    created_via: string;
    version: string;
  };
  revenue_model: Record<string, any>;
  target_market: Record<string, any>;
  competitors: Record<string, any>;
  features: Record<string, any>;
  pricing: Record<string, any>;
  implementation: Record<string, any>;
  validation: Record<string, any>;
}

/**
 * Execute Python revenue CLI command
 */
async function executePythonRevenue(
  projectPath: string,
  command: string,
  args: string[] = []
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const pythonPath = path.join(projectPath, 'auto-claude');
    const fullCommand = ['python', '-m', 'revenue.cli', command, ...args];

    const proc = spawn(fullCommand[0], fullCommand.slice(1), {
      cwd: pythonPath,
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({ success: false, output: stdout, error: stderr });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: '', error: err.message });
    });
  });
}

/**
 * Get BMAD categories structure
 */
export function registerRevenueHandlers() {
  /**
   * Get initial BMAD categories
   */
  ipcMain.handle('revenue:get-bmad-categories', async () => {
    const categories: BMADCategory[] = [
      {
        id: 'revenue_model',
        name: 'Revenue Model',
        description: 'Define your business model and revenue goals',
        completed: false,
        answers: {},
      },
      {
        id: 'target_market',
        name: 'Target Market',
        description: 'Identify your target audience and market opportunity',
        completed: false,
        answers: {},
      },
      {
        id: 'competitors',
        name: 'Competitor Analysis',
        description: 'Research competitors and market positioning',
        completed: false,
        answers: {},
      },
      {
        id: 'features',
        name: 'Feature Scope',
        description: 'Define what you're building and why',
        completed: false,
        answers: {},
      },
      {
        id: 'pricing',
        name: 'Pricing Strategy',
        description: 'Define your pricing model and value proposition',
        completed: false,
        answers: {},
      },
      {
        id: 'implementation',
        name: 'Implementation Plan',
        description: 'Plan your technical approach and timeline',
        completed: false,
        answers: {},
      },
      {
        id: 'validation',
        name: 'Success Metrics',
        description: 'Define how you'll measure and validate success',
        completed: false,
        answers: {},
      },
    ];

    return categories;
  });

  /**
   * Save BMAD category answers
   */
  ipcMain.handle(
    'revenue:save-category-answers',
    async (_event, categoryId: string, answers: Record<string, any>) => {
      // Categories are managed in frontend state
      // This is just for validation if needed
      return { success: true };
    }
  );

  /**
   * Generate BMAD spec from all category answers
   */
  ipcMain.handle(
    'revenue:generate-bmad-spec',
    async (_event, projectPath: string, categories: BMADCategory[]) => {
      try {
        // Compile spec data
        const spec: BMADSpec = {
          metadata: {
            created_via: 'ui_interactive_bmad_builder',
            version: '1.0',
          },
          revenue_model: categories.find((c) => c.id === 'revenue_model')?.answers || {},
          target_market: categories.find((c) => c.id === 'target_market')?.answers || {},
          competitors: categories.find((c) => c.id === 'competitors')?.answers || {},
          features: categories.find((c) => c.id === 'features')?.answers || {},
          pricing: categories.find((c) => c.id === 'pricing')?.answers || {},
          implementation: categories.find((c) => c.id === 'implementation')?.answers || {},
          validation: categories.find((c) => c.id === 'validation')?.answers || {},
        };

        // Save to temp file for Python integration
        const tempFile = path.join(projectPath, '.auto-claude', 'bmad_spec_temp.json');
        await fs.writeFile(tempFile, JSON.stringify(spec, null, 2), 'utf-8');

        return {
          success: true,
          spec,
          tempFile,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }
  );

  /**
   * Get revenue status for a spec
   */
  ipcMain.handle('revenue:get-status', async (_event, projectPath: string, specId: string) => {
    try {
      const result = await executePythonRevenue(projectPath, 'get-revenue-status', [
        '--spec',
        specId,
      ]);

      if (result.success) {
        // Parse JSON output from Python
        const status = JSON.parse(result.output);
        return { success: true, status };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Analyze business (Stripe integration)
   */
  ipcMain.handle('revenue:analyze-business', async (_event, projectPath: string) => {
    try {
      const result = await executePythonRevenue(projectPath, 'analyze-business', [
        '--output',
        'business_analysis.json',
      ]);

      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Find revenue opportunities from competitors
   */
  ipcMain.handle(
    'revenue:find-opportunities',
    async (
      _event,
      projectPath: string,
      competitors: string[],
      features: string[],
      mrr: number
    ) => {
      try {
        const args = [
          '--competitors',
          ...competitors,
          '--features',
          ...features,
          '--mrr',
          mrr.toString(),
          '--output',
          'opportunities.json',
        ];

        const result = await executePythonRevenue(projectPath, 'find-opportunities', args);

        return result;
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  /**
   * Search GitHub for starter projects (MIT/Apache/BSD licensed)
   */
  ipcMain.handle(
    'revenue:search-github-starters',
    async (_event, query: string, language?: string) => {
      try {
        // Build search query with license filter
        const licenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause'];
        let searchQuery = `${query} stars:>100`;

        // Add language filter if provided
        if (language) {
          searchQuery += ` language:${language}`;
        }

        // Search for repos with open licenses
        const licenseQuery = licenses.map(l => `license:${l}`).join(' OR ');
        searchQuery += ` (${licenseQuery})`;

        // Use GitHub CLI to search
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const command = `gh search repos "${query}" --limit 10 --json fullName,description,stargazersCount,license,url,primaryLanguage,updatedAt --sort stars`;

        const { stdout } = await execAsync(command);
        const results = JSON.parse(stdout);

        // Filter to only MIT/Apache/BSD licenses and map to our type
        const starters = results
          .filter((repo: any) => {
            const license = repo.license?.name || repo.license?.key || '';
            return licenses.some(l => license.toLowerCase().includes(l.toLowerCase()));
          })
          .map((repo: any) => ({
            name: repo.fullName.split('/')[1],
            fullName: repo.fullName,
            description: repo.description || 'No description',
            stars: repo.stargazersCount || 0,
            license: repo.license?.name || repo.license?.key || 'Unknown',
            url: repo.url || `https://github.com/${repo.fullName}`,
            language: repo.primaryLanguage || 'Unknown',
            updatedAt: repo.updatedAt || new Date().toISOString()
          }))
          .slice(0, 5); // Return top 5

        return {
          success: true,
          data: starters
        };
      } catch (error: any) {
        // If gh CLI not available or search fails, return empty array
        console.error('[GitHub Search] Error:', error.message);
        return {
          success: true,
          data: []
        };
      }
    }
  );
}
