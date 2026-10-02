#!/usr/bin/env node
/**
 * check-i18n.mjs — Detect hardcoded Japanese strings in TypeScript source files.
 *
 * Rules:
 *   - Only checks .ts/.tsx files in: app/, components/, utils/, hooks/, providers/
 *   - Skips: app/dev/, app/legal/, node_modules/, __tests__/
 *   - Skips files in EXCLUDE_FILES (locale data, normalizer tables, etc.)
 *   - Strips line comments (// ...) before checking — prevents false positives from JA comments
 *   - Strips block comments (/* ... *\/) similarly
 *   - Lines containing `i18n-ignore` anywhere are skipped
 *   - Reports remaining lines with CJK characters as violations
 *
 * Exit code 1 if violations found, 0 if clean.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

const JP_RE = /[　-鿿豈-﫿゠-ヿ぀-ゟ]/;

// Only scan code files, not locale-data files.
// constants/ contains food/onboarding data that is intentionally in JA for JA-mode.
const SCAN_DIRS = ['app', 'components', 'utils', 'hooks', 'providers'];

// Directories to skip entirely (matched against each path segment)
const EXCLUDE_DIR_NAMES = new Set(['dev', 'legal', '__tests__', 'node_modules', '.expo']);

// File names to skip (matched against basename)
const EXCLUDE_FILES = new Set([
  'identity-normalize.ts',  // romanization table IS the data
  'identity-search-keys.ts', // 日本語の表記ゆれ・修飾語を畳み込む言語処理ルール (UI 文字列ではない)
  'unit-labels.ts',         // locale data source
  'nutrition.ts',           // legacy quick-log system (pre-Identity, JA-only)
  'nutrition-data.ts',      // legacy quick-log data (pre-Identity, JA-only)
  'onboarding.ts',          // JA locale data for onboarding — accessed via i18n keys in EN mode
  'body-matrix.ts',         // JA axis labels for body matrix (JA-only constants)
  'dish-master.ts',         // legacy dish system data (pre-Identity, JA-only)
]);

// Suffixes to skip (test files / test data contain JA strings that are test fixtures, not UI)
const EXCLUDE_SUFFIXES = ['.test.ts', '.test.tsx', '.test-data.ts'];

function* walkFiles(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(e.name)) continue;
      yield* walkFiles(join(dir, e.name));
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
      if (!EXCLUDE_FILES.has(e.name) && !EXCLUDE_SUFFIXES.some((s) => e.name.endsWith(s))) {
        yield join(dir, e.name);
      }
    }
  }
}

/** Strip all comment content from a TypeScript source, leaving structure intact. */
function stripComments(src) {
  // Remove block comments /* ... */ (including multi-line)
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // Remove line comments // ...
  out = out.replace(/\/\/.*/g, '');
  return out;
}

let violations = 0;

for (const scanDir of SCAN_DIRS) {
  for (const filePath of walkFiles(join(ROOT, scanDir))) {
    const src = readFileSync(filePath, 'utf8');
    const stripped = stripComments(src);
    const lines = stripped.split('\n');
    const originalLines = src.split('\n');

    let inIgnoreBlock = false;
    lines.forEach((line, idx) => {
      const orig = originalLines[idx] ?? '';
      if (orig.includes('i18n-ignore-start')) { inIgnoreBlock = true; return; }
      if (orig.includes('i18n-ignore-end'))   { inIgnoreBlock = false; return; }
      if (!JP_RE.test(line)) return;
      // Skip if this line or the immediately preceding line contains i18n-ignore
      const prev = originalLines[idx - 1] ?? '';
      if (inIgnoreBlock || orig.includes('i18n-ignore') || prev.includes('i18n-ignore')) return;
      console.log(`${relative(ROOT, filePath)}:${idx + 1}: ${orig.trim()}`);
      violations++;
    });
  }
}

if (violations > 0) {
  console.error(`\n✗ ${violations} hardcoded Japanese string(s) found.`);
  console.error('  Fix by moving to locale files, or add // i18n-ignore if intentional.');
  process.exit(1);
} else {
  console.log('✓ No hardcoded Japanese strings found.');
}
