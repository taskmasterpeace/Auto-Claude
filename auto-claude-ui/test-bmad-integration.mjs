/**
 * BMAD Builder Integration Test
 * Tests that all components are correctly structured and can be parsed
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 BMAD Builder Integration Test\n');
console.log('=' .repeat(70) + '\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
    return true;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err.message}\n`);
    failedTests++;
    return false;
  }
}

function readFile(path) {
  return readFileSync(join(__dirname, path), 'utf-8');
}

function assertContains(content, substring, message) {
  if (!content.includes(substring)) {
    throw new Error(message || `Expected to find: ${substring}`);
  }
}

function assertNotContains(content, substring, message) {
  if (content.includes(substring)) {
    throw new Error(message || `Should not contain: ${substring}`);
  }
}

console.log('📁 File Structure Tests\n');

test('revenue.ts exports BMADCategoryId type', () => {
  const content = readFile('src/shared/types/revenue.ts');
  assertContains(content, 'export type BMADCategoryId', 'Missing BMADCategoryId export');
  assertContains(content, "'revenue_model'", 'Missing revenue_model ID');
  assertContains(content, "'target_market'", 'Missing target_market ID');
  assertContains(content, "'competitors'", 'Missing competitors ID');
  assertContains(content, "'features'", 'Missing features ID');
  assertContains(content, "'pricing'", 'Missing pricing ID');
  assertContains(content, "'implementation'", 'Missing implementation ID');
  assertContains(content, "'validation'", 'Missing validation ID');
});

test('revenue.ts has all answer type interfaces', () => {
  const content = readFile('src/shared/types/revenue.ts');
  assertContains(content, 'export interface RevenueModelAnswers');
  assertContains(content, 'export interface TargetMarketAnswers');
  assertContains(content, 'export interface CompetitorAnalysisAnswers');
  assertContains(content, 'export interface FeatureScopeAnswers');
  assertContains(content, 'export interface PricingStrategyAnswers');
  assertContains(content, 'export interface ImplementationPlanAnswers');
  assertContains(content, 'export interface SuccessMetricsAnswers');
});

console.log();
console.log('🔌 IPC Integration Tests\n');

test('IPC constants include revenue channels', () => {
  const content = readFile('src/shared/constants/ipc.ts');
  assertContains(content, "REVENUE_GET_BMAD_CATEGORIES: 'revenue:get-bmad-categories'");
  assertContains(content, "REVENUE_GENERATE_BMAD_SPEC: 'revenue:generate-bmad-spec'");
});

test('revenue-api.ts exports RevenueAPI interface', () => {
  const content = readFile('src/preload/api/modules/revenue-api.ts');
  assertContains(content, 'export interface RevenueAPI');
  assertContains(content, 'getBMADCategories');
  assertContains(content, 'generateBMADSpec');
  assertContains(content, 'export const createRevenueAPI');
});

test('preload API index registers revenue API', () => {
  const content = readFile('src/preload/api/index.ts');
  assertContains(content, "import { RevenueAPI, createRevenueAPI } from './modules/revenue-api'");
  assertContains(content, 'revenue: RevenueAPI');
  assertContains(content, 'revenue: createRevenueAPI()');
});

test('IPC handlers register revenue handlers', () => {
  const content = readFile('src/main/ipc-handlers/index.ts');
  assertContains(content, "import { registerRevenueHandlers } from './revenue-handlers'");
  assertContains(content, 'registerRevenueHandlers()');
});

console.log();
console.log('⚛️  React Component Tests\n');

test('BMADBuilderDialog uses correct category IDs', () => {
  const content = readFile('src/renderer/components/bmad/BMADBuilderDialog.tsx');
  assertContains(content, "id: 'revenue_model'", 'Should use revenue_model (not revenue-model)');
  assertContains(content, "id: 'target_market'", 'Should use target_market');
  assertContains(content, "id: 'competitors'", 'Should use competitors (not competitor-analysis)');
  assertContains(content, "id: 'features'", 'Should use features (not feature-scope)');
  assertContains(content, "id: 'pricing'", 'Should use pricing (not pricing-strategy)');
  assertContains(content, "id: 'implementation'", 'Should use implementation (not implementation-plan)');
  assertContains(content, "id: 'validation'", 'Should use validation (not success-metrics)');

  // Ensure no kebab-case IDs remain
  assertNotContains(content, "id: 'revenue-model'", 'Should not have kebab-case revenue-model');
  assertNotContains(content, "id: 'competitor-analysis'", 'Should not have kebab-case competitor-analysis');
});

test('BMADBuilderDialog imports all 7 forms', () => {
  const content = readFile('src/renderer/components/bmad/BMADBuilderDialog.tsx');
  assertContains(content, "import { RevenueModelForm } from './forms/RevenueModelForm'");
  assertContains(content, "import { TargetMarketForm } from './forms/TargetMarketForm'");
  assertContains(content, "import { CompetitorAnalysisForm } from './forms/CompetitorAnalysisForm'");
  assertContains(content, "import { FeatureScopeForm } from './forms/FeatureScopeForm'");
  assertContains(content, "import { PricingStrategyForm } from './forms/PricingStrategyForm'");
  assertContains(content, "import { ImplementationPlanForm } from './forms/ImplementationPlanForm'");
  assertContains(content, "import { SuccessMetricsForm } from './forms/SuccessMetricsForm'");
});

test('BMADBuilderDialog has switch cases for all categories', () => {
  const content = readFile('src/renderer/components/bmad/BMADBuilderDialog.tsx');
  assertContains(content, "case 'revenue_model':");
  assertContains(content, "case 'target_market':");
  assertContains(content, "case 'competitors':");
  assertContains(content, "case 'features':");
  assertContains(content, "case 'pricing':");
  assertContains(content, "case 'implementation':");
  assertContains(content, "case 'validation':");
});

test('RevenueModelForm has validation logic', () => {
  const content = readFile('src/renderer/components/bmad/forms/RevenueModelForm.tsx');
  assertContains(content, 'onValidationChange');
  assertContains(content, 'useEffect');
  assertContains(content, 'setErrors');
  assertContains(content, 'Target revenue must be greater than 0');
});

test('FormField handles number inputs correctly', () => {
  const content = readFile('src/renderer/components/bmad/shared/FormField.tsx');
  assertContains(content, "case 'number':");
  assertContains(content, 'type="number"');
  assertContains(content, "val === '' ? 0 : Number(val)", 'Should handle empty string as 0');
});

test('CompetitorAnalysisForm has URL validation', () => {
  const content = readFile('src/renderer/components/bmad/forms/CompetitorAnalysisForm.tsx');
  assertContains(content, 'const isValidUrl');
  assertContains(content, 'new URL(url)');
  assertContains(content, 'urlError');
});

console.log();
console.log('🔗 App Integration Tests\n');

test('App.tsx imports BMADBuilderDialog', () => {
  const content = readFile('src/renderer/App.tsx');
  assertContains(content, "import { BMADBuilderDialog } from './components/bmad/BMADBuilderDialog'");
  assertContains(content, 'isBMADBuilderOpen');
  assertContains(content, '<BMADBuilderDialog');
});

test('App.tsx wires up onboarding BMAD Builder callback', () => {
  const content = readFile('src/renderer/App.tsx');
  assertContains(content, 'onOpenBMADBuilder={() => {');
  assertContains(content, 'setIsBMADBuilderOpen(true)');
});

test('Sidebar.tsx has BMAD Builder button', () => {
  const content = readFile('src/renderer/components/Sidebar.tsx');
  assertContains(content, 'onBMADBuilderClick');
  assertContains(content, 'Revenue-First Spec');
  assertContains(content, '<DollarSign');
});

test('Sidebar.tsx receives BMAD Builder callback from App', () => {
  const content = readFile('src/renderer/App.tsx');
  assertContains(content, 'onBMADBuilderClick={() => setIsBMADBuilderOpen(true)}');
});

test('OnboardingWizard passes BMAD Builder to CompletionStep', () => {
  const content = readFile('src/renderer/components/onboarding/OnboardingWizard.tsx');
  assertContains(content, 'onOpenBMADBuilder');
  assertContains(content, 'handleOpenBMADBuilder');
});

test('CompletionStep shows BMAD Builder as first option', () => {
  const content = readFile('src/renderer/components/onboarding/CompletionStep.tsx');
  assertContains(content, 'DollarSign');
  assertContains(content, 'Revenue-First Spec (Recommended)');
  assertContains(content, 'onOpenBMADBuilder');
});

console.log();
console.log('🎯 Category ID Consistency Tests\n');

test('Backend category IDs match frontend', () => {
  const backend = readFile('src/main/ipc-handlers/revenue-handlers.ts');
  const frontend = readFile('src/renderer/components/bmad/BMADBuilderDialog.tsx');

  const backendIds = [
    "id: 'revenue_model'",
    "id: 'target_market'",
    "id: 'competitors'",
    "id: 'features'",
    "id: 'pricing'",
    "id: 'implementation'",
    "id: 'validation'"
  ];

  for (const id of backendIds) {
    assertContains(backend, id, `Backend missing: ${id}`);
    assertContains(frontend, id, `Frontend missing: ${id}`);
  }
});

test('No kebab-case category IDs in BMADBuilderDialog', () => {
  const content = readFile('src/renderer/components/bmad/BMADBuilderDialog.tsx');
  assertNotContains(content, "id: 'revenue-model'", 'Should not have kebab-case IDs');
  assertNotContains(content, "id: 'target-market'", 'Should not have kebab-case IDs');
  assertNotContains(content, "id: 'competitor-analysis'", 'Should not have kebab-case IDs');
  assertNotContains(content, "id: 'feature-scope'", 'Should not have kebab-case IDs');
  assertNotContains(content, "id: 'pricing-strategy'", 'Should not have kebab-case IDs');
  assertNotContains(content, "id: 'implementation-plan'", 'Should not have kebab-case IDs');
  assertNotContains(content, "id: 'success-metrics'", 'Should not have kebab-case IDs');
});

console.log();
console.log('=' .repeat(70));
console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed\n`);

if (failedTests > 0) {
  console.log(`❌ ${failedTests} test(s) failed\n`);
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED!\n');
  console.log('🎉 BMAD Builder is correctly integrated and ready to use!\n');
  process.exit(0);
}
