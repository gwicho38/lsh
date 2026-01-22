#!/usr/bin/env node
/**
 * Script to add TODO comments above all function definitions
 * Usage: node scripts/add-todos.js
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keywords to skip (not function names)
const SKIP_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'await', 'throw',
  'constructor', 'new', 'typeof', 'instanceof', 'delete', 'void',
  'super', 'this', 'import', 'export', 'default', 'class', 'extends',
  'try', 'finally', 'with', 'debugger', 'case', 'break', 'continue',
]);

function addTodosToFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines = [];
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';

    // Skip if previous line already has a TODO
    if (prevLine.includes('// TODO(@gwicho38): Review -')) {
      newLines.push(line);
      continue;
    }

    // Pattern 1: Standalone function declarations
    // export function foo(), async function foo(), function foo()
    const funcMatch = line.match(/^(\s*)(export\s+)?(async\s+)?function\s+(\w+)\s*\(/);
    if (funcMatch) {
      const [, indent, , , name] = funcMatch;
      if (!SKIP_KEYWORDS.has(name)) {
        newLines.push(`${indent}// TODO(@gwicho38): Review - ${name}`);
        modified = true;
      }
      newLines.push(line);
      continue;
    }

    // Pattern 2: Arrow functions assigned to const/let
    // export const foo = () =>, const foo = async () =>
    const arrowMatch = line.match(/^(\s*)(export\s+)?(const|let)\s+(\w+)\s*=\s*(async\s*)?\(/);
    if (arrowMatch && line.includes('=>')) {
      const [, indent, , , name] = arrowMatch;
      if (!SKIP_KEYWORDS.has(name)) {
        newLines.push(`${indent}// TODO(@gwicho38): Review - ${name}`);
        modified = true;
      }
      newLines.push(line);
      continue;
    }

    // Pattern 3: Arrow function with single param (no parens)
    // export const foo = x =>, const foo = async x =>
    const arrowSingleMatch = line.match(/^(\s*)(export\s+)?(const|let)\s+(\w+)\s*=\s*(async\s+)?(\w+)\s*=>/);
    if (arrowSingleMatch) {
      const [, indent, , , name] = arrowSingleMatch;
      if (!SKIP_KEYWORDS.has(name)) {
        newLines.push(`${indent}// TODO(@gwicho38): Review - ${name}`);
        modified = true;
      }
      newLines.push(line);
      continue;
    }

    // Pattern 4: Class methods (with or without modifiers)
    // public foo(), private async bar(), foo(), async baz()
    const methodMatch = line.match(/^(\s+)(public\s+|private\s+|protected\s+)?(static\s+)?(async\s+)?(\w+)\s*(<[^>]*>)?\s*\([^)]*\)\s*(:\s*[^{]+)?\s*\{?\s*$/);
    if (methodMatch) {
      const [, indent, , , , name] = methodMatch;
      if (!SKIP_KEYWORDS.has(name) && name !== 'get' && name !== 'set') {
        newLines.push(`${indent}// TODO(@gwicho38): Review - ${name}`);
        modified = true;
      }
      newLines.push(line);
      continue;
    }

    // Pattern 5: Getter/setter methods
    const getsetMatch = line.match(/^(\s+)(public\s+|private\s+|protected\s+)?(static\s+)?(get|set)\s+(\w+)\s*\(/);
    if (getsetMatch) {
      const [, indent, , , getset, name] = getsetMatch;
      newLines.push(`${indent}// TODO(@gwicho38): Review - ${getset} ${name}`);
      modified = true;
      newLines.push(line);
      continue;
    }

    // No match, just add the line
    newLines.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    return true;
  }

  return false;
}

function findTsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip test directories and node_modules
      if (entry.name === '__tests__' || entry.name === 'node_modules') {
        continue;
      }
      findTsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Main
const srcDir = path.join(__dirname, '../src');
const files = findTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files`);

let updatedCount = 0;
for (const file of files) {
  if (addTodosToFile(file)) {
    updatedCount++;
    console.log(`Updated ${file}`);
  }
}

console.log(`\nUpdated ${updatedCount} files`);

// Count total TODOs
let totalTodos = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const matches = content.match(/\/\/ TODO\(@gwicho38\): Review -/g);
  if (matches) {
    totalTodos += matches.length;
  }
}
console.log(`Total TODOs: ${totalTodos}`);
