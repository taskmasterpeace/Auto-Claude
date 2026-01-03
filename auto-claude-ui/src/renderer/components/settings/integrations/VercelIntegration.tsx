import { useState, useEffect } from 'react';
import { TriangleIcon, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ExternalLink, Zap, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Separator } from '../../ui/separator';
import type { ProjectEnvConfig } from '../../../../shared/types';

// Vercel-specific types
interface VercelConnectionStatus {
  connected: boolean;
  projectName?: string;
  teamName?: string;
  lastDeploymentStatus?: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED';
  lastDeploymentUrl?: string;
  error?: string;
}

interface VercelIntegrationProps {
  envConfig: ProjectEnvConfig | null;
  updateEnvConfig: (updates: Partial<ProjectEnvConfig>) => void;
}

/**
 * Vercel integration settings component.
 * Manages Vercel API token, project configuration, and auto-fix settings.
 */
export function VercelIntegration({
  envConfig,
  updateEnvConfig
}: VercelIntegrationProps) {
  const [showToken, setShowToken] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<VercelConnectionStatus | null>(null);

  // Check connection when credentials change
  useEffect(() => {
    if (envConfig?.vercelEnabled && envConfig?.vercelToken && envConfig?.vercelProjectId) {
      checkConnection();
    } else {
      setConnectionStatus(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envConfig?.vercelEnabled, envConfig?.vercelToken, envConfig?.vercelProjectId, envConfig?.vercelTeamId]);

  const checkConnection = async () => {
    if (!envConfig?.vercelToken || !envConfig?.vercelProjectId) {
      return;
    }

    setIsCheckingConnection(true);
    try {
      const result = await window.electronAPI.vercelCheckConnection(
        envConfig.vercelToken,
        envConfig.vercelProjectId,
        envConfig.vercelTeamId
      );

      if (result.success && result.data) {
        setConnectionStatus(result.data);
      } else {
        setConnectionStatus({
          connected: false,
          error: result.error || 'Failed to connect to Vercel'
        });
      }
    } catch (err) {
      setConnectionStatus({
        connected: false,
        error: err instanceof Error ? err.message : 'Connection check failed'
      });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  if (!envConfig) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="font-normal text-foreground">Enable Vercel Integration</Label>
          <p className="text-xs text-muted-foreground">
            Auto-detect and fix Vercel build errors after merge
          </p>
        </div>
        <Switch
          checked={envConfig.vercelEnabled}
          onCheckedChange={(checked) => updateEnvConfig({ vercelEnabled: checked })}
        />
      </div>

      {envConfig.vercelEnabled && (
        <>
          {/* API Token */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">API Token</Label>
            <p className="text-xs text-muted-foreground">
              Create a token from{' '}
              <a
                href="https://vercel.com/account/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-info hover:underline inline-flex items-center gap-1"
              >
                Vercel Account Settings
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="your-vercel-api-token"
                value={envConfig.vercelToken || ''}
                onChange={(e) => updateEnvConfig({ vercelToken: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Project ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Project ID</Label>
            <p className="text-xs text-muted-foreground">
              Find in Vercel Dashboard → Your Project → Settings → General → Project ID
            </p>
            <Input
              placeholder="prj_xxxxxxxxxxxxxxxx"
              value={envConfig.vercelProjectId || ''}
              onChange={(e) => updateEnvConfig({ vercelProjectId: e.target.value })}
            />
          </div>

          {/* Team ID (Optional) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Team ID (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              Only required for team accounts. Find in Team Settings → General → Team ID
            </p>
            <Input
              placeholder="team_xxxxxxxxxxxxxxxx"
              value={envConfig.vercelTeamId || ''}
              onChange={(e) => updateEnvConfig({ vercelTeamId: e.target.value })}
            />
          </div>

          {/* Connection Status */}
          {(envConfig.vercelToken && envConfig.vercelProjectId) && (
            <ConnectionStatus
              isChecking={isCheckingConnection}
              connectionStatus={connectionStatus}
              onRefresh={checkConnection}
            />
          )}

          <Separator />

          {/* Auto-Fix Toggle */}
          <AutoFixToggle
            enabled={envConfig.vercelAutoFix || false}
            onToggle={(checked) => updateEnvConfig({ vercelAutoFix: checked })}
          />

          {envConfig.vercelAutoFix && <AutoFixWarning />}

          {/* How It Works Section */}
          <HowItWorksInfo />
        </>
      )}
    </div>
  );
}

interface ConnectionStatusProps {
  isChecking: boolean;
  connectionStatus: VercelConnectionStatus | null;
  onRefresh: () => void;
}

function ConnectionStatus({ isChecking, connectionStatus, onRefresh }: ConnectionStatusProps) {
  const getDeploymentStatusColor = (status?: string) => {
    switch (status) {
      case 'READY':
        return 'text-success';
      case 'ERROR':
        return 'text-destructive';
      case 'BUILDING':
      case 'QUEUED':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Connection Status</p>
          <p className="text-xs text-muted-foreground">
            {isChecking ? 'Checking...' :
              connectionStatus?.connected
                ? `Connected to ${connectionStatus.projectName}${connectionStatus.teamName ? ` (${connectionStatus.teamName})` : ''}`
                : connectionStatus?.error || 'Not connected'}
          </p>
          {connectionStatus?.connected && connectionStatus.lastDeploymentStatus && (
            <p className={`text-xs mt-1 ${getDeploymentStatusColor(connectionStatus.lastDeploymentStatus)}`}>
              Last deployment: {connectionStatus.lastDeploymentStatus.toLowerCase()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isChecking}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : connectionStatus?.connected ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 text-warning" />
          )}
        </div>
      </div>
    </div>
  );
}

interface AutoFixToggleProps {
  enabled: boolean;
  onToggle: (checked: boolean) => void;
}

function AutoFixToggle({ enabled, onToggle }: AutoFixToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-warning" />
          <Label className="font-normal text-foreground">Auto-Fix Mode</Label>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Automatically commit and push fixes without approval
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

function AutoFixWarning() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 ml-6">
      <p className="text-xs text-warning">
        When enabled, fixes are committed and pushed automatically after detection.
        The build will re-trigger on Vercel, and the fix loop continues until success or max attempts (5).
      </p>
    </div>
  );
}

function HowItWorksInfo() {
  return (
    <div className="rounded-lg border border-info/30 bg-info/5 p-3 mt-4">
      <div className="flex items-start gap-3">
        <TriangleIcon className="h-5 w-5 text-info mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">How It Works</p>
          <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
            <li>After you merge a task, Auto Claude monitors the Vercel deployment</li>
            <li>If the build fails, errors are extracted from the build logs</li>
            <li>A Vercel Fixer agent automatically fixes the errors</li>
            <li>With auto-fix disabled: fixes are applied but wait for your approval</li>
            <li>With auto-fix enabled: fixes are committed and pushed automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
