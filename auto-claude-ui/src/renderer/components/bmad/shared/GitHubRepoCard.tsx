import React from 'react';
import { Star, GitFork, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitHubStarterProject } from '@/shared/types/revenue';

interface GitHubRepoCardProps {
  repo: GitHubStarterProject;
  onSelect: (repo: GitHubStarterProject) => void;
  isSelected: boolean;
  disabled?: boolean;
}

/**
 * Displays a GitHub repository search result as a selectable card
 */
export const GitHubRepoCard: React.FC<GitHubRepoCardProps> = ({
  repo,
  onSelect,
  isSelected,
  disabled = false
}) => {
  const formatStars = (stars: number): string => {
    if (stars >= 1000) {
      return `${(stars / 1000).toFixed(1)}k`;
    }
    return stars.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 7) return `Updated ${diffDays}d ago`;
    if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `Updated ${Math.floor(diffDays / 30)}mo ago`;
    return `Updated ${Math.floor(diffDays / 365)}y ago`;
  };

  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-accent/5'
      }`}
      onClick={() => !disabled && onSelect(repo)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Repo name and link */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-sm truncate">{repo.fullName}</h4>
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {repo.description}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span>{formatStars(repo.stars)}</span>
            </div>

            <Badge variant="outline" className="text-xs px-2 py-0">
              {repo.license}
            </Badge>

            {repo.language && (
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {repo.language}
              </Badge>
            )}

            <span className="text-muted-foreground/70">
              {formatDate(repo.updatedAt)}
            </span>
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground shrink-0">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>
    </Card>
  );
};
