#!/usr/bin/env node
/**
 * validate-code.js
 * Deterministic validator for coding agent output.
 * Checks: affected files exist + ESLint + TypeScript compile.
 *
 * Usage: node validate-code.js <feature-id> <task-id>
 * Exit 0: pass. Exit 1: fail (JSON to stdout).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildResult, check } = require('./lib/schema-checker');

function validate(featureId, taskId) {
  const tasksPath = path.join(
    process.cwd(), '.workflow', 'runs', featureId, 'tasks.json'
  );

  const checks = [];

  // Load tasks.json
  checks.push(check('tasks-json-exists', fs.existsSync(tasksPath), `tasks.json not found at ${tasksPath}`));
  if (!fs.existsSync(tasksPath)) {
    outputAndExit(buildResult(checks));
  }

  let tasks;
  try {
    tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8')).tasks;
  } catch (e) {
    checks.push(check('tasks-json-parseable', false, e.message));
    outputAndExit(buildResult(checks));
  }

  const task = tasks.find((t) => t.id === taskId);
  checks.push(
    check('task-found', !!task, `Task '${taskId}' not found in tasks.json`)
  );
  if (!task) outputAndExit(buildResult(checks));

  // Check all affectedFiles exist
  for (const relPath of (task.affectedFiles || [])) {
    const absPath = path.join(process.cwd(), relPath);
    checks.push(
      check(
        `affected-file-exists:${relPath}`,
        fs.existsSync(absPath),
        `Affected file does not exist: ${relPath}`
      )
    );
  }

  // Run ESLint on affected files (TypeScript/JS files only)
  const lintableFiles = (task.affectedFiles || []).filter((f) =>
    /\.(ts|tsx|js|jsx)$/.test(f)
  );

  if (lintableFiles.length > 0) {
    try {
      execSync(
        `npx eslint ${lintableFiles.map((f) => `"${f}"`).join(' ')} --max-warnings=0`,
        { cwd: process.cwd(), stdio: 'pipe' }
      );
      checks.push(check('eslint-pass', true));
    } catch (e) {
      const output = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
      checks.push(
        check('eslint-pass', false, `ESLint failed:\n${output.slice(0, 1000)}`)
      );
    }
  } else {
    checks.push(check('eslint-pass', true, 'No lintable files — skipped'));
  }

  // Run TypeScript type check (project-wide, but only fail on errors in affected files)
  if (lintableFiles.some((f) => /\.tsx?$/.test(f))) {
    try {
      execSync('npx tsc --noEmit', { cwd: process.cwd(), stdio: 'pipe' });
      checks.push(check('typescript-pass', true));
    } catch (e) {
      const output = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
      // Filter output to only show errors in affected files
      const relevantErrors = output
        .split('\n')
        .filter((line) => lintableFiles.some((f) => line.includes(f)))
        .join('\n');
      const message = relevantErrors.length > 0
        ? `TypeScript errors in affected files:\n${relevantErrors.slice(0, 1000)}`
        : `TypeScript errors (not in affected files — may be pre-existing):\n${output.slice(0, 500)}`;
      // Only fail if there are errors in affected files
      checks.push(
        check(
          'typescript-pass',
          relevantErrors.length === 0,
          message
        )
      );
    }
  } else {
    checks.push(check('typescript-pass', true, 'No TypeScript files — skipped'));
  }

  const result = buildResult(checks);
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

function outputAndExit(result) {
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

const [featureId, taskId] = process.argv.slice(2);
if (!featureId || !taskId) {
  console.error('Usage: node validate-code.js <feature-id> <task-id>');
  process.exit(2);
}

validate(featureId, taskId);
