import type { ThinkingLevel } from '../types';

export interface ThinkingLevelInfo {
  value: ThinkingLevel;
  label: string;
  tokens: number | null;
  description: string;
  useCases: string;
  bestFor: string[];
  examples: string[];
  performance: {
    speed: number;    // 1-5 (5 = fastest)
    cost: number;     // 1-5 (5 = cheapest)
    quality: number;  // 1-5 (5 = highest quality)
  };
}

export const THINKING_LEVEL_HELP: Record<ThinkingLevel, ThinkingLevelInfo> = {
  none: {
    value: 'none',
    label: 'None',
    tokens: null,
    description: 'No extended thinking - fastest execution',
    useCases: 'Quick fixes, trivial edits, simple formatting changes',
    bestFor: [
      'Fixing typos and formatting',
      'Updating constants or config',
      'Simple code cleanup'
    ],
    examples: ['Fix typo in README', 'Update color constants', 'Format code'],
    performance: { speed: 5, cost: 5, quality: 2 }
  },
  low: {
    value: 'low',
    label: 'Low',
    tokens: 1024,
    description: 'Brief consideration for straightforward tasks',
    useCases: 'Standard coding tasks with clear requirements',
    bestFor: [
      'CRUD endpoints and basic APIs',
      'UI components following patterns',
      'Simple bug fixes'
    ],
    examples: ['Add user registration endpoint', 'Create login form', 'Fix validation bug'],
    performance: { speed: 4, cost: 4, quality: 3 }
  },
  medium: {
    value: 'medium',
    label: 'Medium',
    tokens: 4096,
    description: 'Moderate analysis for features with design decisions',
    useCases: 'Most development tasks with some complexity',
    bestFor: [
      'New features requiring design',
      'Multi-file changes',
      'Moderate refactoring'
    ],
    examples: ['Add comment system', 'Implement dark mode', 'Refactor API layer'],
    performance: { speed: 3, cost: 3, quality: 4 }
  },
  high: {
    value: 'high',
    label: 'High',
    tokens: 16384,
    description: 'Deep thinking for complex architectural decisions',
    useCases: 'Complex features requiring careful analysis',
    bestFor: [
      'Authentication & authorization',
      'State management overhauls',
      'Performance optimization'
    ],
    examples: ['Implement OAuth2 flow', 'Add Redux state', 'Optimize database queries'],
    performance: { speed: 2, cost: 2, quality: 5 }
  },
  ultrathink: {
    value: 'ultrathink',
    label: 'Ultra Think',
    tokens: 65536,
    description: 'Maximum reasoning for mission-critical features',
    useCases: 'High-stakes features where quality is paramount',
    bestFor: [
      'Security-critical features',
      'Complex data migrations',
      'Comprehensive spec creation'
    ],
    examples: ['Implement encryption', 'Design system architecture', 'Create security audit'],
    performance: { speed: 1, cost: 1, quality: 5 }
  }
};
