import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Loader2, Github } from 'lucide-react';
import { CategoryFormProps, ImplementationPlanAnswers, GitHubStarterProject } from '@/shared/types/revenue';
import { CategoryHeader } from '../shared/CategoryHeader';
import { FormField } from '../shared/FormField';
import { GitHubRepoCard } from '../shared/GitHubRepoCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BUILD_APPROACH_OPTIONS = [
  { value: 'mvp', label: 'MVP (Minimum Viable Product)' },
  { value: 'phased', label: 'Phased Rollout' },
  { value: 'full-scope', label: 'Full Scope Implementation' }
];

/**
 * Implementation Plan Form
 * Defines the build approach, effort estimation, and technical requirements
 */
export const ImplementationPlanForm: React.FC<CategoryFormProps<ImplementationPlanAnswers>> = ({
  answers,
  onChange,
  onValidationChange,
  disabled = false
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newDependency, setNewDependency] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GitHubStarterProject[]>([]);
  const [showGitHubSearch, setShowGitHubSearch] = useState(false);

  // Initialize with default values if empty
  useEffect(() => {
    if (!answers.buildApproach) {
      onChange({
        buildApproach: 'mvp',
        estimatedEffortDays: 0,
        dependencies: [],
        technicalRequirements: ''
      });
    }
    // Only run on initial mount to set defaults
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate form
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!answers.buildApproach) {
      newErrors.buildApproach = 'Build approach is required';
    }

    if (!answers.estimatedEffortDays || answers.estimatedEffortDays <= 0) {
      newErrors.estimatedEffortDays = 'Effort estimate must be greater than 0';
    }

    if (!answers.technicalRequirements || answers.technicalRequirements.trim() === '') {
      newErrors.technicalRequirements = 'Technical requirements are required';
    }

    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [answers, onValidationChange]);

  const handleFieldChange = (field: keyof ImplementationPlanAnswers, value: any) => {
    onChange({
      ...answers,
      [field]: value
    });
  };

  const handleAddDependency = () => {
    if (newDependency.trim()) {
      const updatedDependencies = [...(answers.dependencies || []), newDependency.trim()];
      handleFieldChange('dependencies', updatedDependencies);
      setNewDependency('');
    }
  };

  const handleRemoveDependency = (index: number) => {
    const updatedDependencies = answers.dependencies.filter((_, i) => i !== index);
    handleFieldChange('dependencies', updatedDependencies);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDependency();
    }
  };

  const handleSearchGitHub = async () => {
    if (!answers.technicalRequirements) {
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      // Extract primary language/tech from requirements if possible
      const techRequirements = answers.technicalRequirements.toLowerCase();
      let language: string | undefined;

      if (techRequirements.includes('react')) language = 'TypeScript';
      else if (techRequirements.includes('python')) language = 'Python';
      else if (techRequirements.includes('node')) language = 'JavaScript';
      else if (techRequirements.includes('go')) language = 'Go';
      else if (techRequirements.includes('rust')) language = 'Rust';

      // Search using the technical requirements as query
      const result = await window.electronAPI.revenue.searchGitHubStarters(
        answers.technicalRequirements.substring(0, 100), // First 100 chars
        language
      );

      if (result.success && result.data) {
        setSearchResults(result.data);
        setShowGitHubSearch(true);
      }
    } catch (error) {
      console.error('GitHub search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStarter = (repo: GitHubStarterProject) => {
    handleFieldChange('starterProject', repo);

    // Optionally reduce effort estimate by 30% if using a starter
    if (answers.estimatedEffortDays > 0) {
      const reducedEffort = Math.round(answers.estimatedEffortDays * 0.7);
      handleFieldChange('estimatedEffortDays', reducedEffort);
    }
  };

  const handleClearStarter = () => {
    handleFieldChange('starterProject', undefined);
  };

  return (
    <div>
      <CategoryHeader
        title="Implementation Plan"
        description="Define your technical approach, timeline, and build-vs-buy decisions"
      />

      <div className="space-y-4">
        <FormField
          label="Build Approach"
          name="buildApproach"
          type="select"
          value={answers.buildApproach || ''}
          onChange={(value) => handleFieldChange('buildApproach', value)}
          options={BUILD_APPROACH_OPTIONS}
          required
          disabled={disabled}
          error={errors.buildApproach}
          helpText="Choose your implementation strategy"
        />

        <FormField
          label="Estimated Effort (Days)"
          name="estimatedEffortDays"
          type="number"
          value={answers.estimatedEffortDays || ''}
          onChange={(value) => handleFieldChange('estimatedEffortDays', value)}
          placeholder="30"
          required
          disabled={disabled}
          error={errors.estimatedEffortDays}
          helpText="How many development days will this feature require?"
          min={1}
        />

        {/* Dependencies List */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Dependencies</label>
          <p className="text-xs text-muted-foreground mb-2">
            List external dependencies, APIs, or services required
          </p>

          {/* Existing dependencies */}
          {answers.dependencies && answers.dependencies.length > 0 && (
            <div className="space-y-2 mb-3">
              {answers.dependencies.map((dependency, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="flex-1 text-sm">{dependency}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDependency(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new dependency */}
          <div className="flex gap-2">
            <Input
              value={newDependency}
              onChange={(e) => setNewDependency(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a dependency..."
              disabled={disabled}
            />
            <Button
              onClick={handleAddDependency}
              disabled={!newDependency.trim() || disabled}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <FormField
          label="Technical Requirements"
          name="technicalRequirements"
          type="textarea"
          value={answers.technicalRequirements || ''}
          onChange={(value) => handleFieldChange('technicalRequirements', value)}
          placeholder="Describe the technical stack, infrastructure needs, and any special requirements..."
          required
          disabled={disabled}
          error={errors.technicalRequirements}
          helpText="Detail the technical components and infrastructure needed"
        />

        {/* GitHub Starter Projects Search */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Github className="h-4 w-4" />
                Find Starter Projects (Optional)
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Search GitHub for MIT-licensed projects you can fork instead of building from scratch
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearchGitHub}
              disabled={!answers.technicalRequirements || isSearching || disabled}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-3 w-3 mr-1" />
                  Search GitHub
                </>
              )}
            </Button>
          </div>

          {/* Selected starter project */}
          {answers.starterProject && !showGitHubSearch && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <Github className="h-4 w-4 text-green-600" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Using: {answers.starterProject.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ⭐ {answers.starterProject.stars.toLocaleString()} stars • {answers.starterProject.license} license
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGitHubSearch(true)}
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearStarter}
                  >
                    Remove
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Search results */}
          {showGitHubSearch && searchResults.length > 0 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <p className="text-sm font-medium">
                Found {searchResults.length} starter project{searchResults.length > 1 ? 's' : ''}:
              </p>
              {searchResults.map((repo) => (
                <GitHubRepoCard
                  key={repo.fullName}
                  repo={repo}
                  onSelect={handleSelectStarter}
                  isSelected={answers.starterProject?.fullName === repo.fullName}
                  disabled={disabled}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGitHubSearch(false)}
                className="w-full"
              >
                Hide Results
              </Button>
            </div>
          )}

          {/* No results message */}
          {showGitHubSearch && searchResults.length === 0 && !isSearching && (
            <Alert>
              <AlertDescription>
                No suitable starter projects found. Try refining your technical requirements or build from scratch.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Summary Card */}
      {answers.estimatedEffortDays > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Implementation Summary</h3>
          <p className="text-sm text-muted-foreground">
            Approach: <span className="font-medium">{answers.buildApproach?.toUpperCase().replace('-', ' ')}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Timeline:{' '}
            <span className="font-medium">
              {answers.estimatedEffortDays} days ({Math.ceil(answers.estimatedEffortDays / 5)} weeks)
            </span>
          </p>
          {answers.dependencies && answers.dependencies.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Dependencies: <span className="font-medium">{answers.dependencies.length}</span> identified
            </p>
          )}
          {answers.starterProject && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm font-medium text-green-600 mb-1">
                🚀 Using Starter Project
              </p>
              <p className="text-sm text-muted-foreground">
                <a
                  href={answers.starterProject.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {answers.starterProject.fullName}
                </a>
                {' '}({answers.starterProject.license})
              </p>
              <p className="text-xs text-green-600 mt-1">
                ⭐ {answers.starterProject.stars.toLocaleString()} stars • Estimated 30% time savings
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
