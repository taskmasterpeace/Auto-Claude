import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  FileCode,
  Loader2,
  ExternalLink,
  Library,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import type { Project, LibrarySkill, SkillsLibraryResponse } from '../../../shared/types';

// Category display names and icons
const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
  documents: { label: 'Documents', emoji: '📄' },
  development: { label: 'Development', emoji: '💻' },
  design: { label: 'Design', emoji: '🎨' },
  communication: { label: 'Communication', emoji: '💬' },
  scientific: { label: 'Scientific', emoji: '🔬' },
  project: { label: 'My Skills', emoji: '⭐' },
  other: { label: 'Other', emoji: '📦' }
};

// Order of categories in the UI
const CATEGORY_ORDER = ['project', 'documents', 'development', 'design', 'communication', 'scientific', 'other'];

interface SkillsSettingsProps {
  project: Project;
}

/**
 * Skills Settings component for user-curated skill selection.
 * Allows users to browse the skill library and enable/disable skills per project.
 */
export function SkillsSettings({ project }: SkillsSettingsProps) {
  // Library state
  const [libraryData, setLibraryData] = useState<SkillsLibraryResponse | null>(null);
  const [projectSkills, setProjectSkills] = useState<LibrarySkill[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['project']));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load library, enabled skills, and project skills in parallel
      const [libraryResult, enabledResult, projectResult] = await Promise.all([
        window.electronAPI.getSkillLibrary(),
        window.electronAPI.getEnabledSkills(project.id),
        window.electronAPI.getProjectSkills(project.id)
      ]);

      if (libraryResult.success && libraryResult.data) {
        setLibraryData(libraryResult.data);
      } else if (!libraryResult.success) {
        console.warn('Failed to load skill library:', libraryResult.error);
      }

      if (enabledResult.success && enabledResult.data) {
        setEnabledSkills(new Set(enabledResult.data));
      }

      if (projectResult.success && projectResult.data) {
        setProjectSkills(projectResult.data.skills);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle skill enabled state
  const toggleSkill = useCallback(async (skillId: string, enabled: boolean) => {
    const newEnabled = new Set(enabledSkills);
    if (enabled) {
      newEnabled.add(skillId);
    } else {
      newEnabled.delete(skillId);
    }

    setEnabledSkills(newEnabled);

    // Save to backend
    try {
      const result = await window.electronAPI.setEnabledSkills(project.id, Array.from(newEnabled));
      if (!result.success) {
        console.error('Failed to save enabled skills:', result.error);
        // Revert on error
        setEnabledSkills(enabledSkills);
      }
    } catch (err) {
      console.error('Error saving enabled skills:', err);
      setEnabledSkills(enabledSkills);
    }
  }, [enabledSkills, project.id]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Create new skill
  const handleCreateSkill = async () => {
    if (!newSkillName.trim()) return;

    setIsCreating(true);
    try {
      const result = await window.electronAPI.openSkillInEditor(project.id, newSkillName.trim());
      if (result.success) {
        setShowCreateDialog(false);
        setNewSkillName('');
        // Refresh project skills
        const projectResult = await window.electronAPI.getProjectSkills(project.id);
        if (projectResult.success && projectResult.data) {
          setProjectSkills(projectResult.data.skills);
        }
      } else {
        setError(result.error || 'Failed to create skill');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create skill');
    } finally {
      setIsCreating(false);
    }
  };

  // Open existing skill in editor
  const openSkillInEditor = async (skillName: string) => {
    try {
      await window.electronAPI.openSkillInEditor(project.id, skillName);
    } catch (err) {
      console.error('Failed to open skill:', err);
    }
  };

  // Combine library and project skills, filter by search
  const filteredCategories = useMemo(() => {
    const categories: Record<string, LibrarySkill[]> = {};

    // Add project skills first
    if (projectSkills.length > 0) {
      categories['project'] = projectSkills.filter(skill =>
        !searchQuery ||
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Add library skills
    if (libraryData?.byCategory) {
      for (const [category, skills] of Object.entries(libraryData.byCategory)) {
        if (category === 'project') continue; // Skip, handled above

        const filtered = skills.filter(skill =>
          !searchQuery ||
          skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          skill.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filtered.length > 0) {
          categories[category] = filtered;
        }
      }
    }

    // Sort categories by order
    const sorted: [string, LibrarySkill[]][] = [];
    for (const cat of CATEGORY_ORDER) {
      if (categories[cat] && categories[cat].length > 0) {
        sorted.push([cat, categories[cat]]);
      }
    }
    // Add any remaining categories
    for (const [cat, skills] of Object.entries(categories)) {
      if (!CATEGORY_ORDER.includes(cat) && skills.length > 0) {
        sorted.push([cat, skills]);
      }
    }

    return sorted;
  }, [libraryData, projectSkills, searchQuery]);

  // Count enabled skills
  const enabledCount = enabledSkills.size;
  const totalCount = (libraryData?.totalCount || 0) + projectSkills.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading skills...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {enabledCount} of {totalCount} enabled
          </span>
          <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Skill
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* No library warning */}
      {!libraryData?.hasLibrary && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
          <Library className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Skill Library Not Downloaded</p>
            <p className="text-xs text-muted-foreground">
              Run <code className="px-1 py-0.5 bg-muted rounded">python auto-claude/skills/library.py</code> to download 150+ skills
            </p>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="space-y-2">
        {filteredCategories.map(([category, skills]) => {
          const config = CATEGORY_CONFIG[category] || { label: category, emoji: '📦' };
          const isExpanded = expandedCategories.has(category);
          const isProjectCategory = category === 'project';
          const categoryEnabledCount = skills.filter(s =>
            enabledSkills.has(isProjectCategory ? `project/${s.name}` : `${s.source}/${s.name}`)
          ).length;

          return (
            <Collapsible
              key={category}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="flex items-center w-full p-3 rounded-lg hover:bg-accent/50 transition-colors text-left group">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
                )}
                <span className="mr-2">{config.emoji}</span>
                <span className="font-medium flex-1">{config.label}</span>
                <span className="text-xs text-muted-foreground mr-2">
                  {categoryEnabledCount}/{skills.length} enabled
                </span>
                {isProjectCategory && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateDialog(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className="pl-4 pr-2 pb-2">
                <div className="space-y-1 pt-1">
                  {skills.map((skill) => {
                    const skillId = isProjectCategory ? `project/${skill.name}` : `${skill.source}/${skill.name}`;
                    const isEnabled = enabledSkills.has(skillId);

                    return (
                      <div
                        key={skillId}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/30 transition-colors group"
                      >
                        <Checkbox
                          id={skillId}
                          checked={isEnabled}
                          onCheckedChange={(checked) => toggleSkill(skillId, checked === true)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={skillId}
                            className="text-sm font-medium cursor-pointer flex items-center gap-2"
                          >
                            {skill.name}
                            {isProjectCategory && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openSkillInEditor(skill.name);
                                }}
                                title="Open in editor"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </Label>
                          <p className="text-xs text-muted-foreground truncate">
                            {skill.description || 'No description'}
                          </p>
                          {skill.techStack && skill.techStack.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {skill.techStack.slice(0, 3).map(tech => (
                                <span
                                  key={tech}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No skills match your search' : 'No skills available'}
            </p>
          </div>
        )}
      </div>

      {/* Create Skill Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Create New Skill
            </DialogTitle>
            <DialogDescription>
              Create a custom skill for this project. The skill will be saved to{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.claude/skills/</code>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="skillName">Skill Name</Label>
            <Input
              id="skillName"
              placeholder="my-custom-skill"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSkillName.trim()) {
                  handleCreateSkill();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Use lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSkill} disabled={!newSkillName.trim() || isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create & Open
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
