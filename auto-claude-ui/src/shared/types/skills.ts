/**
 * Skill discovery and management types
 */

// ============================================
// Skill Suggestion Types
// ============================================

export type SkillCategory = 'framework' | 'testing' | 'deployment' | 'security' | 'patterns' | 'database';

/**
 * A suggested skill discovered from project analysis
 */
export interface SkillSuggestion {
  /** Skill name (kebab-case identifier) */
  name: string;

  /** Human-readable description of what the skill does */
  description: string;

  /** Category this skill belongs to */
  category: SkillCategory;

  /** Confidence score (0.0 - 1.0) indicating how relevant this skill is */
  confidence: number;

  /** AI-generated reasoning for why this skill was suggested */
  reasoning: string;

  /** Complete SKILL.md template content ready to be written to disk */
  skill_template: string;

  /** Files that informed this skill suggestion */
  relevant_files: string[];

  /** Technologies this skill covers (e.g., ["react", "typescript"]) */
  tech_stack: string[];
}

// ============================================
// Skill Usage Tracking Types (Phase 5)
// ============================================

/**
 * Event emitted when a skill is used during agent execution
 */
export interface SkillUsageEvent {
  /** Name of the skill that was used */
  skillName: string;

  /** Type of agent that used the skill */
  agentType: string; // "planner" | "coder" | "qa_reviewer" | etc.

  /** Brief context of what the skill was used for */
  context: string;

  /** ISO timestamp when the skill was used */
  timestamp: string;

  /** Optional subtask ID if skill was used during subtask execution */
  subtaskId?: string;
}
