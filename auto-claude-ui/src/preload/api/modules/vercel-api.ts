import { IPC_CHANNELS } from '../../../shared/constants';
import type { IPCResult } from '../../../shared/types';
import { invokeIpc } from './ipc-utils';

// Vercel-specific types (matching the handler types)
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
 * Vercel Integration API operations
 */
export interface VercelAPI {
  vercelCheckConnection: (
    token: string,
    projectId: string,
    teamId?: string
  ) => Promise<IPCResult<VercelConnectionStatus>>;
  getVercelProjects: (
    token: string,
    teamId?: string
  ) => Promise<IPCResult<VercelProject[]>>;
  getVercelDeployments: (
    token: string,
    projectId: string,
    teamId?: string,
    limit?: number
  ) => Promise<IPCResult<VercelDeployment[]>>;
  getVercelProjectInfo: (
    token: string,
    projectId: string,
    teamId?: string
  ) => Promise<IPCResult<VercelProject>>;
}

/**
 * Creates the Vercel Integration API implementation
 */
export const createVercelAPI = (): VercelAPI => ({
  vercelCheckConnection: (
    token: string,
    projectId: string,
    teamId?: string
  ): Promise<IPCResult<VercelConnectionStatus>> =>
    invokeIpc(IPC_CHANNELS.VERCEL_CHECK_CONNECTION, token, projectId, teamId),

  getVercelProjects: (
    token: string,
    teamId?: string
  ): Promise<IPCResult<VercelProject[]>> =>
    invokeIpc(IPC_CHANNELS.VERCEL_GET_PROJECTS, token, teamId),

  getVercelDeployments: (
    token: string,
    projectId: string,
    teamId?: string,
    limit?: number
  ): Promise<IPCResult<VercelDeployment[]>> =>
    invokeIpc(IPC_CHANNELS.VERCEL_GET_DEPLOYMENTS, token, projectId, teamId, limit),

  getVercelProjectInfo: (
    token: string,
    projectId: string,
    teamId?: string
  ): Promise<IPCResult<VercelProject>> =>
    invokeIpc(IPC_CHANNELS.VERCEL_GET_PROJECT_INFO, token, projectId, teamId)
});
