/**
 * BMAD (Business Model, Audience, Differentiators) Builder Types
 * Types for the revenue-first spec builder UI component
 */

// ============================================================================
// Category Types
// ============================================================================

export type BMADCategoryId =
  | 'revenue-model'
  | 'target-market'
  | 'competitor-analysis'
  | 'feature-scope'
  | 'pricing-strategy'
  | 'implementation-plan'
  | 'success-metrics';

export interface BMADCategory {
  id: BMADCategoryId;
  name: string;
  description: string;
  completed: boolean;
  answers: Record<string, any>;
}

// ============================================================================
// Form Answer Types (specific to each category)
// ============================================================================

export interface RevenueModelAnswers {
  revenueType: 'subscription' | 'one-time' | 'usage-based' | 'freemium' | 'enterprise';
  currentMRR: number;
  targetRevenue: number;
  timeframe: '30-days' | '60-days' | '90-days';
}

export interface TargetMarketAnswers {
  customerSegment: string;
  marketSize: number;
  expectedConversionRate: number;
  customerPainPoints: string[];
}

export interface CompetitorAnalysisAnswers {
  competitors: Array<{
    name: string;
    url: string;
    pricePoint: number;
  }>;
  averageMarketPrice: number;
  keyDifferentiators: string;
}

export interface FeatureScopeAnswers {
  featureName: string;
  description: string;
  capabilities: string[];
  coreValue: string;
}

export interface PricingStrategyAnswers {
  pricePoint: number;
  billingFrequency: 'monthly' | 'annual' | 'one-time' | 'usage';
  discounts: {
    annual: boolean;
    volume: boolean;
    enterprise: boolean;
  };
  pricingTiers: Array<{
    name: string;
    price: number;
    features: string[];
  }>;
}

export interface ImplementationPlanAnswers {
  buildApproach: 'mvp' | 'phased' | 'full-scope';
  estimatedEffortDays: number;
  dependencies: string[];
  technicalRequirements: string;
}

export interface SuccessMetricsAnswers {
  primaryMetric: 'revenue' | 'users' | 'conversion' | 'retention' | 'engagement';
  sevenDayTarget: number;
  thirtyDayTarget: number;
  sixtyDayTarget: number;
  secondaryMetrics: string[];
}

// ============================================================================
// Complete BMAD Spec
// ============================================================================

export interface BMADSpec {
  version: string;
  generatedAt: string;
  projectPath: string;
  categories: {
    revenueModel: RevenueModelAnswers;
    targetMarket: TargetMarketAnswers;
    competitorAnalysis: CompetitorAnalysisAnswers;
    featureScope: FeatureScopeAnswers;
    pricingStrategy: PricingStrategyAnswers;
    implementationPlan: ImplementationPlanAnswers;
    successMetrics: SuccessMetricsAnswers;
  };
  calculatedMetrics?: {
    projectedRevenue: number;
    breakEvenTimeframe: number;
    totalAddressableMarket: number;
  };
}

// ============================================================================
// Component Props
// ============================================================================

export interface BMADBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  onSpecGenerated?: (specPath: string, spec: BMADSpec) => void;
  initialData?: Partial<BMADSpec>;
}

export interface CategoryFormProps<T = any> {
  answers: T;
  onChange: (answers: T) => void;
  onValidationChange: (isValid: boolean) => void;
  disabled?: boolean;
}

export interface CategoryProgressIndicatorProps {
  categories: BMADCategory[];
  currentCategoryId: BMADCategoryId;
  onCategoryClick?: (categoryId: BMADCategoryId) => void;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'list';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
}

// ============================================================================
// IPC Response Types
// ============================================================================

export interface BMADGenerationResult {
  success: boolean;
  spec: BMADSpec;
  tempFile: string;
  specPath?: string;
  error?: string;
}

export interface BMADCategoriesResult {
  success: boolean;
  categories: BMADCategory[];
  error?: string;
}

export interface BMADSaveResult {
  success: boolean;
  categoryId: BMADCategoryId;
  error?: string;
}
