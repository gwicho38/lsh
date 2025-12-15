#!/usr/bin/env npx ts-node
/**
 * LSH Repository Health Analyzer
 *
 * A comprehensive analysis tool that provides a snapshot of the repository state.
 * Run this before starting work to understand what needs improvement.
 *
 * Usage:
 *   npx ts-node scripts/analyze-repo.ts           # Full analysis
 *   npx ts-node scripts/analyze-repo.ts --quick   # Quick analysis (skip tests)
 *   npx ts-node scripts/analyze-repo.ts --json    # Output as JSON
 *   npx ts-node scripts/analyze-repo.ts --save    # Save report to docs/REPO_HEALTH.md
 *
 * Categories analyzed:
 * - TypeScript errors and strict mode status
 * - ESLint warnings by rule category
 * - Test coverage and status
 * - Code metrics (LOC, file counts, TODOs)
 * - Documentation status
 * - Dependency health
 */

import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface AnalysisResult {
  timestamp: string;
  duration: number;
  typescript: TypeScriptAnalysis;
  eslint: ESLintAnalysis;
  tests: TestAnalysis;
  codeMetrics: CodeMetrics;
  documentation: DocumentationAnalysis;
  dependencies: DependencyAnalysis;
  issues: IssueTracker;
  summary: Summary;
}

interface TypeScriptAnalysis {
  errors: number;
  strictModeStatus: Record<string, boolean>;
  noImplicitAnyErrors: number;
}

interface ESLintAnalysis {
  totalWarnings: number;
  totalErrors: number;
  byRule: Record<string, number>;
  byCategory: {
    hardcodedStrings: number;
    unusedVars: number;
    explicitAny: number;
    other: number;
  };
}

interface TestAnalysis {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: {
    lines: number;
    statements: number;
    branches: number;
    functions: number;
  };
  slowTests: string[];
}

interface CodeMetrics {
  totalFiles: number;
  totalLines: number;
  srcLines: number;
  testLines: number;
  byExtension: Record<string, number>;
  largestFiles: Array<{ file: string; lines: number }>;
  todos: number;
  fixmes: number;
  hacks: number;
}

interface DocumentationAnalysis {
  hasReadme: boolean;
  hasClaudeMd: boolean;
  hasArchitecture: boolean;
  hasTypeSafetyTodo: boolean;
  docFiles: number;
  undocumentedExports: number;
}

interface DependencyAnalysis {
  production: number;
  development: number;
  outdated: number;
  vulnerabilities: number;
}

interface IssueTracker {
  criticalIssues: string[];
  warnings: string[];
  improvements: string[];
}

interface Summary {
  healthScore: number;  // 0-100
  grade: string;  // A, B, C, D, F
  topPriorities: string[];
}

// ============================================================================
// UTILITIES
// ============================================================================

function run(cmd: string, silent = true): string {
  try {
    const result = execSync(cmd, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
      maxBuffer: 50 * 1024 * 1024,  // 50MB buffer
    });
    return result || '';
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    // Return stdout even if command failed (e.g., lint with warnings)
    return execError.stdout || execError.stderr || '';
  }
}

function countMatches(content: string, pattern: RegExp): number {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function progressBar(current: number, total: number, width = 20): string {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(pct * 100)}%`;
}

// ============================================================================
// ANALYZERS
// ============================================================================

function analyzeTypeScript(): TypeScriptAnalysis {
  console.log('  📝 Analyzing TypeScript...');

  // Run typecheck
  const typecheckOutput = run('npx tsc --noEmit 2>&1 || true');
  const errorCount = countMatches(typecheckOutput, /error TS\d+/g);

  // Check strict mode flags from tsconfig
  let strictModeStatus: Record<string, boolean> = {};
  try {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf-8'));
    const opts = tsconfig.compilerOptions || {};
    strictModeStatus = {
      strict: opts.strict === true,
      strictNullChecks: opts.strictNullChecks === true,
      strictFunctionTypes: opts.strictFunctionTypes === true,
      strictBindCallApply: opts.strictBindCallApply === true,
      strictPropertyInitialization: opts.strictPropertyInitialization === true,
      noImplicitThis: opts.noImplicitThis === true,
      noImplicitAny: opts.noImplicitAny === true,
      alwaysStrict: opts.alwaysStrict === true,
    };
  } catch {
    // Ignore if tsconfig doesn't exist
  }

  // Estimate noImplicitAny errors
  const noImplicitAnyOutput = run('npx tsc --noEmit --noImplicitAny 2>&1 || true');
  const noImplicitAnyErrors = countMatches(noImplicitAnyOutput, /error TS7\d+/g);

  return {
    errors: errorCount,
    strictModeStatus,
    noImplicitAnyErrors,
  };
}

function analyzeESLint(): ESLintAnalysis {
  console.log('  🔍 Analyzing ESLint...');

  const lintOutput = run('npm run lint 2>&1 || true');

  // Count by rule
  const byRule: Record<string, number> = {};
  const ruleMatches = lintOutput.matchAll(/warning\s+(.+?)\s+(\S+)$/gm);
  for (const match of ruleMatches) {
    const rule = match[2];
    byRule[rule] = (byRule[rule] || 0) + 1;
  }

  // Count errors vs warnings
  const summaryMatch = lintOutput.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
  const totalErrors = summaryMatch ? parseInt(summaryMatch[2], 10) : 0;
  const totalWarnings = summaryMatch ? parseInt(summaryMatch[3], 10) : 0;

  // Categorize
  const byCategory = {
    hardcodedStrings: byRule['lsh/no-hardcoded-strings'] || 0,
    unusedVars: byRule['@typescript-eslint/no-unused-vars'] || 0,
    explicitAny: byRule['@typescript-eslint/no-explicit-any'] || 0,
    other: 0,
  };
  byCategory.other = totalWarnings - byCategory.hardcodedStrings -
    byCategory.unusedVars - byCategory.explicitAny;

  return {
    totalWarnings,
    totalErrors,
    byRule,
    byCategory,
  };
}

function analyzeTests(quick: boolean): TestAnalysis {
  if (quick) {
    console.log('  🧪 Skipping tests (quick mode)...');
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      coverage: { lines: 0, statements: 0, branches: 0, functions: 0 },
      slowTests: [],
    };
  }

  console.log('  🧪 Running tests (this may take a minute)...');

  // Run tests with coverage
  const testOutput = run('npm run test:coverage 2>&1 || true');

  // Parse test results
  const testsMatch = testOutput.match(/Tests:\s+(\d+) passed,?\s*(\d+)? failed,?\s*(\d+)? skipped,?\s*(\d+) total/);
  const total = testsMatch ? parseInt(testsMatch[4], 10) : 0;
  const passed = testsMatch ? parseInt(testsMatch[1], 10) : 0;
  const failed = testsMatch ? parseInt(testsMatch[2] || '0', 10) : 0;
  const skipped = testsMatch ? parseInt(testsMatch[3] || '0', 10) : 0;

  // Parse coverage
  const coverage = { lines: 0, statements: 0, branches: 0, functions: 0 };
  const stmtMatch = testOutput.match(/Statements\s+:\s+([\d.]+)%/);
  const branchMatch = testOutput.match(/Branches\s+:\s+([\d.]+)%/);
  const funcMatch = testOutput.match(/Functions\s+:\s+([\d.]+)%/);
  const lineMatch = testOutput.match(/Lines\s+:\s+([\d.]+)%/);

  if (stmtMatch) coverage.statements = parseFloat(stmtMatch[1]);
  if (branchMatch) coverage.branches = parseFloat(branchMatch[1]);
  if (funcMatch) coverage.functions = parseFloat(funcMatch[1]);
  if (lineMatch) coverage.lines = parseFloat(lineMatch[1]);

  // Find slow tests (> 1 second)
  const slowTests: string[] = [];
  const slowMatches = testOutput.matchAll(/\((\d+(?:\.\d+)?)\s*s\)\s*(.+)/g);
  for (const match of slowMatches) {
    const time = parseFloat(match[1]);
    if (time > 1) {
      slowTests.push(`${match[2].trim()} (${time}s)`);
    }
  }

  return {
    total,
    passed,
    failed,
    skipped,
    coverage,
    slowTests: slowTests.slice(0, 5),  // Top 5 slow tests
  };
}

function analyzeCodeMetrics(): CodeMetrics {
  console.log('  📊 Analyzing code metrics...');

  // Count files and lines
  const srcFiles = run('find src -name "*.ts" -o -name "*.tsx" | head -500').trim().split('\n').filter(Boolean);
  const testFiles = run('find src -name "*.test.ts" -o -name "*.test.tsx" | head -100').trim().split('\n').filter(Boolean);

  let totalLines = 0;
  let srcLines = 0;
  let testLines = 0;
  const byExtension: Record<string, number> = {};
  const fileSizes: Array<{ file: string; lines: number }> = [];

  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').length;
      totalLines += lines;

      const ext = path.extname(file);
      byExtension[ext] = (byExtension[ext] || 0) + lines;

      if (file.includes('.test.')) {
        testLines += lines;
      } else {
        srcLines += lines;
        fileSizes.push({ file, lines });
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Sort by size and get top 10
  fileSizes.sort((a, b) => b.lines - a.lines);
  const largestFiles = fileSizes.slice(0, 10);

  // Count TODOs, FIXMEs, HACKs
  const allContent = run('grep -r "TODO\\|FIXME\\|HACK" src --include="*.ts" 2>/dev/null || true');
  const todos = countMatches(allContent, /TODO/gi);
  const fixmes = countMatches(allContent, /FIXME/gi);
  const hacks = countMatches(allContent, /HACK/gi);

  return {
    totalFiles: srcFiles.length,
    totalLines,
    srcLines,
    testLines,
    byExtension,
    largestFiles,
    todos,
    fixmes,
    hacks,
  };
}

function analyzeDocumentation(): DocumentationAnalysis {
  console.log('  📚 Analyzing documentation...');

  const hasReadme = fs.existsSync('README.md');
  const hasClaudeMd = fs.existsSync('CLAUDE.md');
  const hasArchitecture = fs.existsSync('docs/ARCHITECTURE.md');
  const hasTypeSafetyTodo = fs.existsSync('docs/TYPE_SAFETY_TODO.md');

  // Count doc files
  const docFilesOutput = run('find docs -name "*.md" 2>/dev/null | wc -l').trim();
  const docFiles = parseInt(docFilesOutput, 10) || 0;

  // Count undocumented exports (functions/classes without JSDoc)
  const exportPattern = run('grep -r "^export " src/lib --include="*.ts" 2>/dev/null | wc -l').trim();
  const jsdocPattern = run('grep -B1 "^export " src/lib --include="*.ts" 2>/dev/null | grep -c "\\*\\/" || true').trim();
  const totalExports = parseInt(exportPattern, 10) || 0;
  const documentedExports = parseInt(jsdocPattern, 10) || 0;
  const undocumentedExports = Math.max(0, totalExports - documentedExports);

  return {
    hasReadme,
    hasClaudeMd,
    hasArchitecture,
    hasTypeSafetyTodo,
    docFiles,
    undocumentedExports,
  };
}

function analyzeDependencies(): DependencyAnalysis {
  console.log('  📦 Analyzing dependencies...');

  // Count dependencies
  let production = 0;
  let development = 0;
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    production = Object.keys(pkg.dependencies || {}).length;
    development = Object.keys(pkg.devDependencies || {}).length;
  } catch {
    // Ignore
  }

  // Check for outdated (quick check)
  const outdatedOutput = run('npm outdated --json 2>/dev/null || true');
  let outdated = 0;
  try {
    const outdatedPkg = JSON.parse(outdatedOutput || '{}');
    outdated = Object.keys(outdatedPkg).length;
  } catch {
    // Ignore
  }

  // Check for vulnerabilities (quick check)
  const auditOutput = run('npm audit --json 2>/dev/null || true');
  let vulnerabilities = 0;
  try {
    const audit = JSON.parse(auditOutput || '{}');
    vulnerabilities = audit.metadata?.vulnerabilities?.total || 0;
  } catch {
    // Ignore
  }

  return {
    production,
    development,
    outdated,
    vulnerabilities,
  };
}

function identifyIssues(
  ts: TypeScriptAnalysis,
  lint: ESLintAnalysis,
  tests: TestAnalysis,
  docs: DocumentationAnalysis,
  deps: DependencyAnalysis
): IssueTracker {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const improvements: string[] = [];

  // Critical issues
  if (ts.errors > 0) {
    criticalIssues.push(`TypeScript has ${ts.errors} compilation errors`);
  }
  if (lint.totalErrors > 0) {
    criticalIssues.push(`ESLint has ${lint.totalErrors} errors`);
  }
  if (tests.failed > 0) {
    criticalIssues.push(`${tests.failed} tests are failing`);
  }
  if (deps.vulnerabilities > 0) {
    criticalIssues.push(`${deps.vulnerabilities} security vulnerabilities in dependencies`);
  }

  // Warnings
  if (lint.byCategory.explicitAny > 50) {
    warnings.push(`High number of explicit 'any' types (${lint.byCategory.explicitAny})`);
  }
  if (tests.coverage.lines < 50) {
    warnings.push(`Test coverage is low (${tests.coverage.lines}% lines)`);
  }
  if (ts.noImplicitAnyErrors > 100) {
    warnings.push(`~${ts.noImplicitAnyErrors} noImplicitAny errors to fix`);
  }
  if (deps.outdated > 10) {
    warnings.push(`${deps.outdated} outdated dependencies`);
  }

  // Improvements
  if (lint.byCategory.hardcodedStrings > 100) {
    improvements.push(`Move ${lint.byCategory.hardcodedStrings} hardcoded strings to constants`);
  }
  if (docs.undocumentedExports > 20) {
    improvements.push(`Add JSDoc to ${docs.undocumentedExports} undocumented exports`);
  }
  if (tests.slowTests.length > 0) {
    improvements.push(`Optimize ${tests.slowTests.length} slow tests`);
  }
  if (!docs.hasArchitecture) {
    improvements.push('Add ARCHITECTURE.md documentation');
  }

  return { criticalIssues, warnings, improvements };
}

function calculateScore(
  ts: TypeScriptAnalysis,
  lint: ESLintAnalysis,
  tests: TestAnalysis,
  docs: DocumentationAnalysis,
  issues: IssueTracker
): Summary {
  let score = 100;

  // Deductions for critical issues (major impact)
  score -= issues.criticalIssues.length * 15;

  // Deductions for warnings (moderate impact)
  score -= issues.warnings.length * 5;

  // Deductions for improvements needed (minor impact)
  score -= Math.min(issues.improvements.length * 2, 10);

  // Bonus for good practices
  if (tests.coverage.lines >= 70) score += 5;
  if (docs.hasClaudeMd && docs.hasArchitecture) score += 5;
  if (ts.strictModeStatus.strictNullChecks) score += 3;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Generate top priorities
  const topPriorities: string[] = [];
  topPriorities.push(...issues.criticalIssues.slice(0, 2));
  if (topPriorities.length < 3) {
    topPriorities.push(...issues.warnings.slice(0, 3 - topPriorities.length));
  }
  if (topPriorities.length < 3) {
    topPriorities.push(...issues.improvements.slice(0, 3 - topPriorities.length));
  }

  return {
    healthScore: Math.round(score),
    grade: getGrade(score),
    topPriorities,
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateConsoleReport(result: AnalysisResult): void {
  const { typescript, eslint, tests, codeMetrics, documentation, dependencies, issues, summary } = result;

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    LSH REPOSITORY HEALTH REPORT                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`  Generated: ${result.timestamp}`);
  console.log(`  Analysis Duration: ${result.duration}s`);

  // Summary
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ SUMMARY                                                          │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log(`  Health Score: ${summary.healthScore}/100 (Grade: ${summary.grade})`);
  console.log(`  ${progressBar(summary.healthScore, 100, 30)}`);

  if (summary.topPriorities.length > 0) {
    console.log('\n  🎯 Top Priorities:');
    summary.topPriorities.forEach((p, i) => console.log(`     ${i + 1}. ${p}`));
  }

  // TypeScript
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ TYPESCRIPT                                                       │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log(`  Compilation Errors: ${typescript.errors === 0 ? '✅ 0' : `❌ ${typescript.errors}`}`);
  console.log(`  noImplicitAny Errors: ${typescript.noImplicitAnyErrors} (not enabled yet)`);
  console.log('  Strict Mode Flags:');
  Object.entries(typescript.strictModeStatus).forEach(([flag, enabled]) => {
    console.log(`    ${enabled ? '✅' : '⬜'} ${flag}`);
  });

  // ESLint
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ ESLINT                                                           │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log(`  Errors: ${eslint.totalErrors === 0 ? '✅ 0' : `❌ ${eslint.totalErrors}`}`);
  console.log(`  Warnings: ${eslint.totalWarnings}`);
  console.log('  By Category:');
  console.log(`    Hardcoded Strings: ${eslint.byCategory.hardcodedStrings}`);
  console.log(`    Explicit Any:      ${eslint.byCategory.explicitAny}`);
  console.log(`    Unused Variables:  ${eslint.byCategory.unusedVars}`);
  console.log(`    Other:             ${eslint.byCategory.other}`);

  // Tests
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ TESTS                                                            │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  if (tests.total === 0) {
    console.log('  (Skipped in quick mode)');
  } else {
    console.log(`  Total: ${tests.total} | Passed: ${tests.passed} | Failed: ${tests.failed} | Skipped: ${tests.skipped}`);
    console.log('  Coverage:');
    console.log(`    Lines:      ${progressBar(tests.coverage.lines, 100)} ${tests.coverage.lines}%`);
    console.log(`    Statements: ${progressBar(tests.coverage.statements, 100)} ${tests.coverage.statements}%`);
    console.log(`    Branches:   ${progressBar(tests.coverage.branches, 100)} ${tests.coverage.branches}%`);
    console.log(`    Functions:  ${progressBar(tests.coverage.functions, 100)} ${tests.coverage.functions}%`);
    if (tests.slowTests.length > 0) {
      console.log('  Slow Tests:');
      tests.slowTests.forEach(t => console.log(`    ⏱️  ${t}`));
    }
  }

  // Code Metrics
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ CODE METRICS                                                     │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log(`  Files: ${formatNumber(codeMetrics.totalFiles)}`);
  console.log(`  Lines: ${formatNumber(codeMetrics.totalLines)} (src: ${formatNumber(codeMetrics.srcLines)}, test: ${formatNumber(codeMetrics.testLines)})`);
  console.log(`  TODOs: ${codeMetrics.todos} | FIXMEs: ${codeMetrics.fixmes} | HACKs: ${codeMetrics.hacks}`);
  console.log('  Largest Files:');
  codeMetrics.largestFiles.slice(0, 5).forEach(f => {
    console.log(`    ${formatNumber(f.lines).padStart(5)} lines  ${f.file}`);
  });

  // Documentation
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ DOCUMENTATION                                                    │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log(`  ${documentation.hasReadme ? '✅' : '❌'} README.md`);
  console.log(`  ${documentation.hasClaudeMd ? '✅' : '❌'} CLAUDE.md`);
  console.log(`  ${documentation.hasArchitecture ? '✅' : '❌'} ARCHITECTURE.md`);
  console.log(`  ${documentation.hasTypeSafetyTodo ? '✅' : '❌'} TYPE_SAFETY_TODO.md`);
  console.log(`  Doc Files: ${documentation.docFiles}`);
  console.log(`  Undocumented Exports: ${documentation.undocumentedExports}`);

  // Dependencies
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ DEPENDENCIES                                                     │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log(`  Production: ${dependencies.production}`);
  console.log(`  Development: ${dependencies.development}`);
  console.log(`  Outdated: ${dependencies.outdated}`);
  console.log(`  Vulnerabilities: ${dependencies.vulnerabilities === 0 ? '✅ 0' : `⚠️  ${dependencies.vulnerabilities}`}`);

  // Issues
  if (issues.criticalIssues.length > 0 || issues.warnings.length > 0) {
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ ISSUES TO ADDRESS                                                │');
    console.log('└─────────────────────────────────────────────────────────────────┘');

    if (issues.criticalIssues.length > 0) {
      console.log('  🚨 Critical:');
      issues.criticalIssues.forEach(i => console.log(`     • ${i}`));
    }

    if (issues.warnings.length > 0) {
      console.log('  ⚠️  Warnings:');
      issues.warnings.forEach(i => console.log(`     • ${i}`));
    }

    if (issues.improvements.length > 0) {
      console.log('  💡 Improvements:');
      issues.improvements.forEach(i => console.log(`     • ${i}`));
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('  Run with --save to export this report to docs/REPO_HEALTH.md');
  console.log('══════════════════════════════════════════════════════════════════\n');
}

function generateMarkdownReport(result: AnalysisResult): string {
  const { typescript, eslint, tests, codeMetrics, documentation, dependencies, issues, summary } = result;

  let md = `# LSH Repository Health Report

Generated: ${result.timestamp}
Analysis Duration: ${result.duration}s

## Summary

| Metric | Value |
|--------|-------|
| Health Score | **${summary.healthScore}/100** (Grade: ${summary.grade}) |
| TypeScript Errors | ${typescript.errors} |
| ESLint Warnings | ${eslint.totalWarnings} |
| Test Coverage | ${tests.coverage.lines}% lines |

### Top Priorities

${summary.topPriorities.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None - looking good!'}

## TypeScript

- Compilation Errors: ${typescript.errors}
- noImplicitAny Errors: ~${typescript.noImplicitAnyErrors} (not enabled yet)

### Strict Mode Status

| Flag | Status |
|------|--------|
${Object.entries(typescript.strictModeStatus).map(([flag, enabled]) =>
  `| ${flag} | ${enabled ? '✅ Enabled' : '⬜ Disabled'} |`
).join('\n')}

## ESLint

- Errors: ${eslint.totalErrors}
- Warnings: ${eslint.totalWarnings}

### By Category

| Category | Count |
|----------|-------|
| Hardcoded Strings | ${eslint.byCategory.hardcodedStrings} |
| Explicit Any | ${eslint.byCategory.explicitAny} |
| Unused Variables | ${eslint.byCategory.unusedVars} |
| Other | ${eslint.byCategory.other} |

## Tests

| Metric | Value |
|--------|-------|
| Total | ${tests.total} |
| Passed | ${tests.passed} |
| Failed | ${tests.failed} |
| Skipped | ${tests.skipped} |

### Coverage

| Type | Coverage |
|------|----------|
| Lines | ${tests.coverage.lines}% |
| Statements | ${tests.coverage.statements}% |
| Branches | ${tests.coverage.branches}% |
| Functions | ${tests.coverage.functions}% |

${tests.slowTests.length > 0 ? `### Slow Tests\n\n${tests.slowTests.map(t => `- ${t}`).join('\n')}` : ''}

## Code Metrics

| Metric | Value |
|--------|-------|
| Total Files | ${formatNumber(codeMetrics.totalFiles)} |
| Total Lines | ${formatNumber(codeMetrics.totalLines)} |
| Source Lines | ${formatNumber(codeMetrics.srcLines)} |
| Test Lines | ${formatNumber(codeMetrics.testLines)} |
| TODOs | ${codeMetrics.todos} |
| FIXMEs | ${codeMetrics.fixmes} |
| HACKs | ${codeMetrics.hacks} |

### Largest Files

| Lines | File |
|-------|------|
${codeMetrics.largestFiles.slice(0, 10).map(f => `| ${formatNumber(f.lines)} | ${f.file} |`).join('\n')}

## Documentation

| Document | Status |
|----------|--------|
| README.md | ${documentation.hasReadme ? '✅' : '❌'} |
| CLAUDE.md | ${documentation.hasClaudeMd ? '✅' : '❌'} |
| ARCHITECTURE.md | ${documentation.hasArchitecture ? '✅' : '❌'} |
| TYPE_SAFETY_TODO.md | ${documentation.hasTypeSafetyTodo ? '✅' : '❌'} |

- Doc Files: ${documentation.docFiles}
- Undocumented Exports: ${documentation.undocumentedExports}

## Dependencies

| Type | Count |
|------|-------|
| Production | ${dependencies.production} |
| Development | ${dependencies.development} |
| Outdated | ${dependencies.outdated} |
| Vulnerabilities | ${dependencies.vulnerabilities} |

## Issues to Address

${issues.criticalIssues.length > 0 ? `### 🚨 Critical\n\n${issues.criticalIssues.map(i => `- ${i}`).join('\n')}\n` : ''}
${issues.warnings.length > 0 ? `### ⚠️ Warnings\n\n${issues.warnings.map(i => `- ${i}`).join('\n')}\n` : ''}
${issues.improvements.length > 0 ? `### 💡 Improvements\n\n${issues.improvements.map(i => `- ${i}`).join('\n')}\n` : ''}

---

*Report generated by \`scripts/analyze-repo.ts\`*
`;

  return md;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const quick = args.includes('--quick');
  const json = args.includes('--json');
  const save = args.includes('--save');

  console.log('\n🔬 LSH Repository Analyzer');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  // Run analyses
  console.log('Running analyses...\n');
  const typescript = analyzeTypeScript();
  const eslint = analyzeESLint();
  const tests = analyzeTests(quick);
  const codeMetrics = analyzeCodeMetrics();
  const documentation = analyzeDocumentation();
  const dependencies = analyzeDependencies();

  // Identify issues
  const issues = identifyIssues(typescript, eslint, tests, documentation, dependencies);
  const summary = calculateScore(typescript, eslint, tests, documentation, issues);

  const duration = Math.round((Date.now() - startTime) / 1000);

  // Build result
  const result: AnalysisResult = {
    timestamp: new Date().toISOString(),
    duration,
    typescript,
    eslint,
    tests,
    codeMetrics,
    documentation,
    dependencies,
    issues,
    summary,
  };

  // Output
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    generateConsoleReport(result);
  }

  // Save to file
  if (save) {
    const reportPath = 'docs/REPO_HEALTH.md';
    fs.writeFileSync(reportPath, generateMarkdownReport(result));
    console.log(`📄 Report saved to ${reportPath}\n`);
  }
}

main().catch(console.error);
