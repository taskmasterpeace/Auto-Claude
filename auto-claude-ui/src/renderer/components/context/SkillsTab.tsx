import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Code2,
  TestTube,
  Rocket,
  Shield,
  FileCode,
  Database
} from 'lucide-react';
import type { SkillSuggestion, SkillCategory } from '../../../shared/types';
import { cn } from '../../lib/utils';

// Category to icon mapping
const categoryIcons: Record<SkillCategory, React.ElementType> = {
  framework: Code2,
  testing: TestTube,
  deployment: Rocket,
  security: Shield,
  patterns: FileCode,
  database: Database
};

// Category to color mapping for badges
const categoryColors: Record<SkillCategory, string> = {
  framework: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  testing: 'bg-green-500/10 text-green-600 border-green-500/30',
  deployment: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  security: 'bg-red-500/10 text-red-600 border-red-500/30',
  patterns: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  database: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30'
};

interface SkillCardProps {
  suggestion: SkillSuggestion;
  onApprove: () => void;
  onDismiss: () => void;
}

/**
 * Individual skill suggestion card with expandable details
 * Follows the MemoryCard pattern for consistency
 */
function SkillCard({ suggestion, onApprove, onDismiss }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = categoryIcons[suggestion.category];

  // Determine if card has content worth expanding
  const hasContent = suggestion.reasoning ||
                     suggestion.skill_template ||
                     suggestion.relevant_files.length > 0;

  // Confidence level for badge styling
  const confidenceLevel = suggestion.confidence > 0.8 ? 'high' :
                         suggestion.confidence > 0.6 ? 'medium' : 'low';

  const confidenceBadgeClass = confidenceLevel === 'high'
    ? 'bg-success/10 text-success border-success/30'
    : confidenceLevel === 'medium'
    ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
    : 'bg-muted text-muted-foreground border-muted-foreground/30';

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Icon */}
          <div className="p-2 rounded-lg bg-accent/10 shrink-0">
            <Icon className="h-4 w-4 text-accent" />
          </div>

          {/* Main content */}
          <div className="flex-1 space-y-2 min-w-0">
            {/* Title and category badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold break-words">
                {suggestion.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn('capitalize text-xs', categoryColors[suggestion.category])}
              >
                {suggestion.category}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {suggestion.description}
            </p>

            {/* Metadata row - confidence + tech stack */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Confidence badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Confidence:</span>
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', confidenceBadgeClass)}
                >
                  {(suggestion.confidence * 100).toFixed(0)}%
                </Badge>
              </div>

              {/* Tech stack badges */}
              {suggestion.tech_stack.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">Stack:</span>
                  {suggestion.tech_stack.slice(0, 3).map(tech => (
                    <Badge key={tech} variant="secondary" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                  {suggestion.tech_stack.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{suggestion.tech_stack.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expand/Collapse button */}
          {hasContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="gap-1 shrink-0"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span className="text-xs">Less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="text-xs">More</span>
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Expanded content section */}
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-4 pt-4 border-t border-border/50">
            {/* Reasoning section */}
            {suggestion.reasoning && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Why this skill?</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                  {suggestion.reasoning}
                </p>
              </div>
            )}

            {/* Relevant files section */}
            {suggestion.relevant_files.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Based on {suggestion.relevant_files.length} file(s)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pl-6">
                  {suggestion.relevant_files.slice(0, 8).map(file => (
                    <Badge key={file} variant="outline" className="text-xs font-mono">
                      {file.split('/').pop()}
                    </Badge>
                  ))}
                  {suggestion.relevant_files.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{suggestion.relevant_files.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Template preview section */}
            {suggestion.skill_template && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">SKILL.md Preview</span>
                </div>
                <ScrollArea className="h-48 w-full border rounded-lg bg-muted/50">
                  <pre className="text-xs font-mono whitespace-pre-wrap p-3">
                    {suggestion.skill_template}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Action buttons */}
      <CardContent className={cn('pt-0', expanded ? 'pt-4' : 'pt-3')}>
        <div className="flex items-center gap-2">
          <Button
            onClick={onApprove}
            variant="default"
            size="sm"
            className="flex-1 bg-success hover:bg-success/90 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Create Skill
          </Button>
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SkillsTabProps {
  projectId: string;
}

/**
 * Skills tab component - displays AI-discovered skill suggestions
 * Follows MemoriesTab pattern for consistency
 */
export function SkillsTab({ projectId }: SkillsTabProps) {
  const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load skill suggestions from backend
   */
  async function loadSuggestions() {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.discoverSkills(projectId);

      if (result.success && result.data) {
        setSuggestions(result.data);
      } else {
        setError(result.error || 'Failed to discover skills');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('[SkillsTab] Error loading suggestions:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle skill approval - create the skill
   */
  async function handleApprove(suggestion: SkillSuggestion) {
    try {
      const result = await window.electronAPI.createSkill(projectId, suggestion);

      if (result.success) {
        // Remove from suggestions list
        setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));

        // TODO: Show success toast notification
        console.log(`[SkillsTab] Created skill: ${suggestion.name}`);
      } else {
        console.error(`[SkillsTab] Failed to create skill:`, result.error);
        // TODO: Show error toast notification
      }
    } catch (err) {
      console.error('[SkillsTab] Error creating skill:', err);
      // TODO: Show error toast notification
    }
  }

  /**
   * Handle skill dismissal
   */
  async function handleDismiss(suggestion: SkillSuggestion) {
    try {
      const result = await window.electronAPI.dismissSkill(projectId, suggestion.name);

      if (result.success) {
        // Remove from suggestions list
        setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));

        console.log(`[SkillsTab] Dismissed skill: ${suggestion.name}`);
      } else {
        console.error(`[SkillsTab] Failed to dismiss skill:`, result.error);
      }
    } catch (err) {
      console.error('[SkillsTab] Error dismissing skill:', err);
    }
  }

  // Load suggestions on mount and when projectId changes
  useEffect(() => {
    loadSuggestions();
  }, [projectId]);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Suggested Skills
            </h2>
            <p className="text-sm text-muted-foreground">
              AI-discovered skills tailored to your project's tech stack
            </p>
          </div>

          <Button
            onClick={loadSuggestions}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            {loading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>

        {/* Error state */}
        {error && !loading && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    Failed to discover skills
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {error}
                  </p>
                  <Button
                    onClick={loadSuggestions}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Analyzing project for skill opportunities...
              </p>
            </div>
          </div>
        )}

        {/* Empty state - no suggestions */}
        {!loading && !error && suggestions.length === 0 && (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 rounded-full bg-muted">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    No skill suggestions at this time
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Skills are suggested based on your project's tech stack and patterns.
                    They're checked against awesome-claude-skills to avoid duplicates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestions list */}
        {!loading && suggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {suggestions.length} skill suggestion{suggestions.length !== 1 ? 's' : ''}
              </p>
            </div>

            {suggestions.map(suggestion => (
              <SkillCard
                key={suggestion.name}
                suggestion={suggestion}
                onApprove={() => handleApprove(suggestion)}
                onDismiss={() => handleDismiss(suggestion)}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
