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

// ============================================
// Skills Library Types (User-Curated Selection)
// ============================================

/** Categories for organizing skills in the UI */
export type LibrarySkillCategory =
  | 'documents'
  | 'development'
  | 'design'
  | 'communication'
  | 'scientific'
  | 'other'
  | 'project'; // User's custom skills

/**
 * Skill metadata from the skill library
 */
export interface LibrarySkill {
  /** Skill name (identifier) */
  name: string;

  /** Human-readable description */
  description: string;

  /** Source repository (e.g., "anthropic", "k-dense-scientific") */
  source: string;

  /** Path to SKILL.md relative to skill-library/ */
  path: string;

  /** Tags for filtering */
  tags: string[];

  /** Tech stack this skill applies to */
  techStack: string[];

  /** Inferred category for UI grouping */
  category: LibrarySkillCategory;
}

/**
 * Skills organized by category for the UI
 */
export interface SkillsByCategory {
  [category: string]: LibrarySkill[];
}

/**
 * Response from SKILLS_GET_LIBRARY
 */
export interface SkillsLibraryResponse {
  /** All skills organized by category */
  byCategory: SkillsByCategory;

  /** Total number of skills in library */
  totalCount: number;

  /** Whether the library has been downloaded */
  hasLibrary: boolean;
}

/**
 * Response from SKILLS_GET_PROJECT
 */
export interface ProjectSkillsResponse {
  /** Custom skills in .claude/skills/ */
  skills: LibrarySkill[];
}

/**
 * Config for enabled skills (.auto-claude/enabled_skills.json)
 */
export interface EnabledSkillsConfig {
  /** Config version */
  version: string;

  /** List of enabled skill IDs (e.g., "anthropic/pdf") */
  enabled: string[];
}
