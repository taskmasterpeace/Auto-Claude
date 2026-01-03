/**
 * Vercel integration IPC handlers
 *
 * Handles Vercel API operations for the UI.
 */

import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';

// Vercel-specific types
interface VercelConnectionStatus {
  connected: boolean;
  projectName?: string;
  teamName?: string;
  lastDeploymentStatus?: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED';
  lastDeploymentUrl?: string;
  error?: string;
}

interface VercelProject {
  id: string;
  name: string;
  framework?: string;
  latestDeployment?: {
    readyState: string;
    url?: string;
    createdAt: number;
  };
}

interface VercelDeployment {
  uid: string;
  name: string;
  state: string;
  url?: string;
  createdAt: number;
  readyAt?: number;
  buildingAt?: number;
  creator?: {
    username: string;
  };
}

/**
 * Make a request to the Vercel API
 */
async function vercelRequest<T>(
  token: string,
  endpoint: string,
  teamId?: string
): Promise<T> {
  const url = new URL(`https://api.vercel.com${endpoint}`);
  if (teamId) {
    url.searchParams.set('teamId', teamId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Vercel API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Register all Vercel-related IPC handlers
 */
export function registerVercelHandlers(
  _getMainWindow: () => BrowserWindow | null
): void {
  // ============================================
  // Vercel Integration Operations
  // ============================================

  /**
   * Check connection to Vercel and get project info
   */
  ipcMain.handle(
    IPC_CHANNELS.VERCEL_CHECK_CONNECTION,
    async (_, token: string, projectId: string, teamId?: string): Promise<IPCResult<VercelConnectionStatus>> => {
      if (!token || !projectId) {
        return {
          success: true,
          data: {
            connected: false,
            error: 'Missing token or project ID'
          }
        };
      }

      try {
        // Get project info
        const project = await vercelRequest<{
          id: string;
          name: string;
          accountId: string;
          framework?: string;
          latestDeployments?: Array<{
            readyState: string;
            url?: string;
            createdAt: number;
          }>;
        }>(token, `/v9/projects/${projectId}`, teamId);

        // Get team name if teamId is provided
        let teamName: string | undefined;
        if (teamId) {
          try {
            const team = await vercelRequest<{ name: string }>(token, `/v2/teams/${teamId}`);
            teamName = team.name;
          } catch {
            // Team fetch failed, but connection is still valid
          }
        }

        // Get latest deployment status
        let lastDeploymentStatus: VercelConnectionStatus['lastDeploymentStatus'];
        let lastDeploymentUrl: string | undefined;

        if (project.latestDeployments && project.latestDeployments.length > 0) {
          const latest = project.latestDeployments[0];
          lastDeploymentStatus = latest.readyState as VercelConnectionStatus['lastDeploymentStatus'];
          lastDeploymentUrl = latest.url ? `https://${latest.url}` : undefined;
        }

        return {
          success: true,
          data: {
            connected: true,
            projectName: project.name,
            teamName,
            lastDeploymentStatus,
            lastDeploymentUrl
          }
        };
      } catch (error) {
        return {
          success: true,
          data: {
            connected: false,
            error: error instanceof Error ? error.message : 'Failed to connect to Vercel'
          }
        };
      }
    }
  );

  /**
   * Get list of projects (for future project selector dropdown)
   */
  ipcMain.handle(
    IPC_CHANNELS.VERCEL_GET_PROJECTS,
    async (_, token: string, teamId?: string): Promise<IPCResult<VercelProject[]>> => {
      if (!token) {
        return { success: false, error: 'No Vercel token provided' };
      }

      try {
        const response = await vercelRequest<{
          projects: Array<{
            id: string;
            name: string;
            framework?: string;
            latestDeployments?: Array<{
              readyState: string;
              url?: string;
              createdAt: number;
            }>;
          }>;
        }>(token, '/v9/projects', teamId);

        const projects: VercelProject[] = response.projects.map(p => ({
          id: p.id,
          name: p.name,
          framework: p.framework,
          latestDeployment: p.latestDeployments?.[0] ? {
            readyState: p.latestDeployments[0].readyState,
            url: p.latestDeployments[0].url,
            createdAt: p.latestDeployments[0].createdAt
          } : undefined
        }));

        return { success: true, data: projects };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch Vercel projects'
        };
      }
    }
  );

  /**
   * Get deployments for a project
   */
  ipcMain.handle(
    IPC_CHANNELS.VERCEL_GET_DEPLOYMENTS,
    async (_, token: string, projectId: string, teamId?: string, limit = 10): Promise<IPCResult<VercelDeployment[]>> => {
      if (!token || !projectId) {
        return { success: false, error: 'Missing token or project ID' };
      }

      try {
        const endpoint = `/v6/deployments?projectId=${projectId}&limit=${limit}`;
        const response = await vercelRequest<{
          deployments: Array<{
            uid: string;
            name: string;
            state: string;
            url?: string;
            createdAt: number;
            ready?: number;
            buildingAt?: number;
            creator?: {
              username: string;
            };
          }>;
        }>(token, endpoint, teamId);

        const deployments: VercelDeployment[] = response.deployments.map(d => ({
          uid: d.uid,
          name: d.name,
          state: d.state,
          url: d.url ? `https://${d.url}` : undefined,
          createdAt: d.createdAt,
          readyAt: d.ready,
          buildingAt: d.buildingAt,
          creator: d.creator
        }));

        return { success: true, data: deployments };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch deployments'
        };
      }
    }
  );

  /**
   * Get detailed project info
   */
  ipcMain.handle(
    IPC_CHANNELS.VERCEL_GET_PROJECT_INFO,
    async (_, token: string, projectId: string, teamId?: string): Promise<IPCResult<VercelProject>> => {
      if (!token || !projectId) {
        return { success: false, error: 'Missing token or project ID' };
      }

      try {
        const project = await vercelRequest<{
          id: string;
          name: string;
          framework?: string;
          latestDeployments?: Array<{
            readyState: string;
            url?: string;
            createdAt: number;
          }>;
        }>(token, `/v9/projects/${projectId}`, teamId);

        return {
          success: true,
          data: {
            id: project.id,
            name: project.name,
            framework: project.framework,
            latestDeployment: project.latestDeployments?.[0] ? {
              readyState: project.latestDeployments[0].readyState,
              url: project.latestDeployments[0].url,
              createdAt: project.latestDeployments[0].createdAt
            } : undefined
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch project info'
        };
      }
    }
  );
}
