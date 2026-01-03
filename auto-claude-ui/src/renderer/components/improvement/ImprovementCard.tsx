/**
 * Improvement Card component
 *
 * Displays a proposed improvement with detailed context, evidence,
 * and approve/dismiss actions.
 */

import React, { useState } from 'react';
import { useImprovementStore } from '../../stores/improvement-store';
import type { ImprovementCard as ImprovementCardType } from '../../../shared/types';
import { cn } from '../../lib/utils';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Code,
  Layout,
  FileText,
  Shield,
  Zap,
  Award,
  ExternalLink,
  Wrench,
  Settings,
  FileCode,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Search,
  Clock,
  Target,
  ArrowRight,
} from 'lucide-react';

interface ImprovementCardProps {
  card: ImprovementCardType;
}

export const ImprovementCard: React.FC<ImprovementCardProps> = ({ card }) => {
  const { approveCard, dismissCard, applyCard } = useImprovementStore();
  const [expanded, setExpanded] = useState(false);

  const getTypeIcon = () => {
    switch (card.type) {
      case 'code':
        return <Code className="w-4 h-4" />;
      case 'ui_ux':
        return <Layout className="w-4 h-4" />;
      case 'docs':
        return <FileText className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      case 'performance':
        return <Zap className="w-4 h-4" />;
      case 'quality':
        return <Award className="w-4 h-4" />;
      case 'reflection':
        return <Lightbulb className="w-4 h-4" />;
      case 'discovery':
        return <Search className="w-4 h-4" />;
      case 'optimization':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (card.type) {
      case 'reflection':
        return 'Learned from past tasks';
      case 'discovery':
        return 'Discovered tool/resource';
      case 'optimization':
        return 'Performance optimization';
      default:
        return card.type.replace(/_/g, ' ');
    }
  };

  const getActionIcon = () => {
    switch (card.suggested_action.type) {
      case 'tool_install':
        return <Wrench className="w-3 h-3" />;
      case 'config_change':
        return <Settings className="w-3 h-3" />;
      case 'code_change':
        return <FileCode className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const getStatusStyles = () => {
    switch (card.status) {
      case 'proposed':
        return 'border-primary/30 bg-primary/5';
      case 'approved':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'applied':
        return 'border-green-500/30 bg-green-500/5';
      case 'dismissed':
        return 'border-muted opacity-60';
      default:
        return 'border-border';
    }
  };

  const getEffortBadge = () => {
    const colors: Record<string, string> = {
      trivial: 'bg-green-500/10 text-green-600',
      small: 'bg-blue-500/10 text-blue-600',
      medium: 'bg-yellow-500/10 text-yellow-600',
      large: 'bg-red-500/10 text-red-600',
    };
    return colors[card.suggested_action.effort] || colors.medium;
  };

  const getEffortDescription = () => {
    switch (card.suggested_action.effort) {
      case 'trivial':
        return '< 5 minutes';
      case 'small':
        return '< 30 minutes';
      case 'medium':
        return '< 2 hours';
      case 'large':
        return '> 2 hours';
      default:
        return '';
    }
  };

  const isActionable = card.status === 'proposed' || card.status === 'approved';

  return (
    <div className={cn('border rounded-lg transition-colors', getStatusStyles())}>
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn('p-2 rounded-lg bg-muted', card.status === 'applied' && 'bg-green-500/10')}>
          {getTypeIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{card.title}</h4>
            {card.evidence.url && (
              <a
                href={card.evidence.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{card.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-muted">
              {getTypeLabel()}
            </span>
            <span className={cn('px-2 py-0.5 text-xs rounded-full', getEffortBadge())}>
              {card.suggested_action.effort} ({getEffortDescription()})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={cn(
              'px-2 py-0.5 text-xs rounded-full capitalize',
              card.status === 'proposed' && 'bg-primary/20 text-primary',
              card.status === 'approved' && 'bg-blue-500/20 text-blue-600',
              card.status === 'applied' && 'bg-green-500/20 text-green-600',
              card.status === 'dismissed' && 'bg-muted text-muted-foreground'
            )}
          >
            {card.status}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t mt-0 pt-4 space-y-4">
          {/* Why this was generated */}
          <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-primary">
            <h5 className="text-sm font-medium mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              Why This Card Was Generated
            </h5>
            <p className="text-sm text-muted-foreground">{card.description}</p>
          </div>

          {/* Evidence with detailed context */}
          {card.evidence && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Evidence & Context
              </h5>
              <div className="bg-muted p-3 rounded-lg text-sm space-y-3">
                {card.evidence.occurrences !== undefined && card.evidence.occurrences > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Pattern occurred:</span>
                    <span className="font-medium text-primary">{card.evidence.occurrences} times</span>
                  </div>
                )}

                {card.evidence.severity && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Severity:</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        card.evidence.severity === 'high' && 'bg-red-500/20 text-red-600',
                        card.evidence.severity === 'medium' && 'bg-yellow-500/20 text-yellow-600',
                        card.evidence.severity === 'low' && 'bg-green-500/20 text-green-600'
                      )}
                    >
                      {card.evidence.severity.toUpperCase()}
                    </span>
                  </div>
                )}

                {card.evidence.affected_specs && card.evidence.affected_specs.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Affected tasks:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {card.evidence.affected_specs.map((spec, i) => (
                        <span key={i} className="px-2 py-0.5 bg-background rounded text-xs">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {card.evidence.examples && card.evidence.examples.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-2">Real examples from your code:</span>
                    <div className="space-y-2">
                      {card.evidence.examples.slice(0, 5).map((ex, i) => (
                        <div
                          key={i}
                          className="bg-background p-2 rounded border border-border/50 font-mono text-xs"
                        >
                          <code className="text-red-500">{ex}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {card.evidence.metrics && Object.keys(card.evidence.metrics).length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Metrics:</span>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(card.evidence.metrics).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-medium">{typeof value === 'number' ? value.toFixed(1) : value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {card.evidence.relevance_score !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Relevance to your project:</span>
                    <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${card.evidence.relevance_score * 100}%` }}
                      />
                    </div>
                    <span className="font-medium">{(card.evidence.relevance_score * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggested action */}
          <div>
            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Recommended Action
            </h5>
            <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                {getActionIcon()}
                <div>
                  <span className="text-xs text-muted-foreground uppercase">
                    {card.suggested_action.type.replace(/_/g, ' ')}
                  </span>
                  <p className="mt-1">{card.suggested_action.details}</p>
                </div>
              </div>
            </div>
          </div>

          {/* What happens when you approve */}
          {isActionable && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                What Happens If You Approve
              </h5>
              <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg text-sm text-muted-foreground">
                {card.suggested_action.type === 'prompt_update' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>Future planning phases will include checks for this pattern</li>
                    <li>The coder agent will be more careful about this issue type</li>
                    <li>QA will specifically look for this issue early in validation</li>
                  </ul>
                )}
                {card.suggested_action.type === 'tool_install' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>You'll be prompted to install the suggested tool/MCP server</li>
                    <li>The tool will be available for future tasks</li>
                    <li>Configuration will be added to your project settings</li>
                  </ul>
                )}
                {card.suggested_action.type === 'config_change' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>The suggested configuration change will be applied</li>
                    <li>You'll be asked to confirm before any changes are made</li>
                    <li>Changes can be reverted if needed</li>
                  </ul>
                )}
                {card.suggested_action.type === 'code_change' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>A task will be created to implement the suggested code change</li>
                    <li>You can review and modify the task before starting</li>
                    <li>The change will go through the normal QA process</li>
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {isActionable && (
            <div className="flex gap-2 pt-2">
              {card.status === 'proposed' && (
                <>
                  <button
                    onClick={() => approveCard(card.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Approve</span>
                  </button>
                  <button
                    onClick={() => dismissCard(card.id)}
                    className="flex items-center gap-1.5 px-4 py-2 border rounded-md hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span className="text-sm">Dismiss</span>
                  </button>
                </>
              )}
              {card.status === 'approved' && (
                <button
                  onClick={() => applyCard(card.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Mark as Applied</span>
                </button>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created: {new Date(card.created_at).toLocaleDateString()}
            </span>
            {card.approved_at && (
              <span>Approved: {new Date(card.approved_at).toLocaleDateString()}</span>
            )}
            {card.applied_at && (
              <span>Applied: {new Date(card.applied_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovementCard;
