import { useState, useEffect } from 'react';
import { Zap, Github, TriangleIcon, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from './ui/tooltip';
import type { ProjectEnvConfig } from '../../shared/types';

interface IntegrationBadgesProps {
  projectId: string;
  className?: string;
}

interface IntegrationStatus {
  linear: boolean;
  github: boolean;
  vercel: boolean;
}

/**
 * Shows small badges indicating which integrations are connected for a project.
 * Displays Linear, GitHub, and Vercel status with icons.
 */
export function IntegrationBadges({ projectId, className }: IntegrationBadgesProps) {
  const [status, setStatus] = useState<IntegrationStatus>({
    linear: false,
    github: false,
    vercel: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEnvConfig = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await window.electronAPI.getProjectEnv(projectId);
        if (result.success && result.data) {
          const config: ProjectEnvConfig = result.data;
          setStatus({
            linear: config.linearEnabled && !!config.linearApiKey,
            github: config.githubEnabled && !!config.githubToken && !!config.githubRepo,
            vercel: config.vercelEnabled && !!config.vercelToken && !!config.vercelProjectId
          });
        }
      } catch (error) {
        console.error('Failed to fetch integration status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvConfig();
  }, [projectId]);

  // Don't render anything if still loading or no integrations connected
  if (isLoading) {
    return null;
  }

  const hasAnyIntegration = status.linear || status.github || status.vercel;

  if (!hasAnyIntegration) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1.5 mt-2', className)}>
      {status.linear && (
        <IntegrationBadge
          icon={Zap}
          label="Linear"
          connected={true}
          tooltip="Linear integration connected"
        />
      )}
      {status.github && (
        <IntegrationBadge
          icon={Github}
          label="GitHub"
          connected={true}
          tooltip="GitHub integration connected"
        />
      )}
      {status.vercel && (
        <IntegrationBadge
          icon={TriangleIcon}
          label="Vercel"
          connected={true}
          tooltip="Vercel integration connected"
        />
      )}
    </div>
  );
}

interface IntegrationBadgeProps {
  icon: React.ElementType;
  label: string;
  connected: boolean;
  tooltip: string;
}

function IntegrationBadge({ icon: Icon, label, connected, tooltip }: IntegrationBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
            'border transition-colors cursor-default',
            connected
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-muted border-border text-muted-foreground'
          )}
        >
          <Icon className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">{label}</span>
          {connected ? (
            <CheckCircle2 className="h-2.5 w-2.5" />
          ) : (
            <XCircle className="h-2.5 w-2.5" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact version showing just icons without labels.
 * For use in tighter spaces like dropdown items.
 */
export function IntegrationBadgesCompact({ projectId, className }: IntegrationBadgesProps) {
  const [status, setStatus] = useState<IntegrationStatus>({
    linear: false,
    github: false,
    vercel: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEnvConfig = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await window.electronAPI.getProjectEnv(projectId);
        if (result.success && result.data) {
          const config: ProjectEnvConfig = result.data;
          setStatus({
            linear: config.linearEnabled && !!config.linearApiKey,
            github: config.githubEnabled && !!config.githubToken && !!config.githubRepo,
            vercel: config.vercelEnabled && !!config.vercelToken && !!config.vercelProjectId
          });
        }
      } catch (error) {
        console.error('Failed to fetch integration status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvConfig();
  }, [projectId]);

  if (isLoading) {
    return null;
  }

  const hasAnyIntegration = status.linear || status.github || status.vercel;

  if (!hasAnyIntegration) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {status.linear && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Zap className="h-3 w-3 text-success" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Linear connected
          </TooltipContent>
        </Tooltip>
      )}
      {status.github && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Github className="h-3 w-3 text-success" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            GitHub connected
          </TooltipContent>
        </Tooltip>
      )}
      {status.vercel && (
        <Tooltip>
          <TooltipTrigger asChild>
            <TriangleIcon className="h-3 w-3 text-success" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Vercel connected
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
