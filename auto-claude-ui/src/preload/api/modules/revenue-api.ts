import { IPC_CHANNELS } from '../../../shared/constants';
import type {
  BMADCategory,
  BMADSpec,
  BMADGenerationResult,
  BMADCategoriesResult,
  BMADSaveResult,
  GitHubStarterProject,
  IPCResult
} from '../../../shared/types';
import { invokeIpc } from './ipc-utils';

/**
 * Revenue API operations for BMAD (Business Model, Audience, Differentiators) builder
 */
export interface RevenueAPI {
  // BMAD Builder operations
  getBMADCategories: () => Promise<IPCResult<BMADCategory[]>>;
  saveCategoryAnswers: (categoryId: string, answers: Record<string, any>) => Promise<IPCResult<void>>;
  generateBMADSpec: (projectPath: string, categories: BMADCategory[]) => Promise<IPCResult<BMADGenerationResult>>;

  // GitHub starter project search
  searchGitHubStarters: (query: string, language?: string) => Promise<IPCResult<GitHubStarterProject[]>>;

  // Revenue tracking and analysis
  getRevenueStatus: (projectPath: string, specId: string) => Promise<IPCResult<any>>;
  analyzeBusiness: (projectPath: string) => Promise<IPCResult<any>>;
  findOpportunities: (projectPath: string, competitors: string[], features: string[], mrr: number) => Promise<IPCResult<any>>;
}

/**
 * Creates the Revenue API implementation
 */
export const createRevenueAPI = (): RevenueAPI => ({
  // BMAD Builder operations
  getBMADCategories: (): Promise<IPCResult<BMADCategory[]>> =>
    invokeIpc(IPC_CHANNELS.REVENUE_GET_BMAD_CATEGORIES),

  saveCategoryAnswers: (categoryId: string, answers: Record<string, any>): Promise<IPCResult<void>> =>
    invokeIpc(IPC_CHANNELS.REVENUE_SAVE_CATEGORY_ANSWERS, categoryId, answers),

  generateBMADSpec: (projectPath: string, categories: BMADCategory[]): Promise<IPCResult<BMADGenerationResult>> =>
    invokeIpc(IPC_CHANNELS.REVENUE_GENERATE_BMAD_SPEC, projectPath, categories),

  // GitHub starter project search
  searchGitHubStarters: (query: string, language?: string): Promise<IPCResult<GitHubStarterProject[]>> =>
    invokeIpc(IPC_CHANNELS.REVENUE_SEARCH_GITHUB_STARTERS, query, language),

  // Revenue tracking and analysis
  getRevenueStatus: (projectPath: string, specId: string): Promise<IPCResult<any>> =>
    invokeIpc(IPC_CHANNELS.REVENUE_GET_STATUS, projectPath, specId),

  analyzeBusiness: (projectPath: string): Promise<IPCResult<any>> =>
    invokeIpc(IPC_CHANNELS.REVENUE_ANALYZE_BUSINESS, projectPath),

  findOpportunities: (projectPath: string, competitors: string[], features: string[], mrr: number): Promise<IPCResult<any>> =>
    invokeIpc(IPC_CHANNELS.REVENUE_FIND_OPPORTUNITIES, projectPath, competitors, features, mrr)
});
