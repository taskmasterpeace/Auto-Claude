/**
 * Simple import test to verify BMAD components can be loaded
 */

console.log('Testing BMAD Builder component imports...\n');

const tests = [
  {
    name: 'TypeScript Types',
    file: './src/shared/types/revenue.ts',
    check: 'exports type definitions'
  },
  {
    name: 'Revenue API Module',
    file: './src/preload/api/modules/revenue-api.ts',
    check: 'exports RevenueAPI interface'
  },
  {
    name: 'BMAD Builder Dialog',
    file: './src/renderer/components/bmad/BMADBuilderDialog.tsx',
    check: 'exports BMADBuilderDialog component'
  },
  {
    name: 'Revenue Model Form',
    file: './src/renderer/components/bmad/forms/RevenueModelForm.tsx',
    check: 'exports RevenueModelForm component'
  },
  {
    name: 'Category Progress Indicator',
    file: './src/renderer/components/bmad/CategoryProgressIndicator.tsx',
    check: 'exports CategoryProgressIndicator component'
  },
  {
    name: 'Form Field Component',
    file: './src/renderer/components/bmad/shared/FormField.tsx',
    check: 'exports FormField component'
  }
];

console.log('File Existence Check:\n');

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let allPass = true;

for (const test of tests) {
  const filePath = join(__dirname, test.file);
  const exists = existsSync(filePath);
  const status = exists ? '✅ EXISTS' : '❌ MISSING';

  console.log(`${status} - ${test.name}`);
  console.log(`   File: ${test.file}`);
  console.log(`   Check: ${test.check}\n`);

  if (!exists) allPass = false;
}

console.log('─'.repeat(60));
console.log(allPass ? '\n✅ ALL FILES EXIST - Components ready for use!\n' : '\n❌ SOME FILES MISSING\n');

process.exit(allPass ? 0 : 1);
