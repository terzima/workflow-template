#!/usr/bin/env node
/**
 * validate-tasks.js
 * Deterministic validator for tasks.json artifacts.
 * Most complex validator: JSON schema + dependency ordering + cycle detection.
 *
 * Usage: node validate-tasks.js <feature-id>
 * Exit 0: pass. Exit 1: fail (JSON to stdout).
 */

const fs = require('fs');
const path = require('path');
const { buildResult, check } = require('./lib/schema-checker');

const VALID_PHASES = ['foundation', 'feature', 'integration', 'cleanup'];
const VALID_STATUSES = ['pending', 'in_progress', 'done', 'blocked'];
const VALID_COMPLEXITIES = ['small', 'medium', 'large'];
const TASK_ID_PATTERN = /^task-\d{3}$/;
const FEATURE_ID_PATTERN = /^feat-\d{4}-.+$/;

function validate(featureId) {
  const tasksPath = path.join(
    process.cwd(), '.workflow', 'runs', featureId, 'tasks.json'
  );

  const checks = [];

  // File existence
  const fileExists = fs.existsSync(tasksPath);
  checks.push(check('file-exists', fileExists, `tasks.json not found at ${tasksPath}`));
  if (!fileExists) {
    outputAndExit(buildResult(checks));
  }

  // Valid JSON
  let data;
  try {
    data = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
    checks.push(check('valid-json', true));
  } catch (e) {
    checks.push(check('valid-json', false, `Invalid JSON: ${e.message}`));
    outputAndExit(buildResult(checks));
  }

  // Top-level required fields
  const topLevelRequired = ['featureId', 'architectureVersion', 'generatedAt', 'tasks'];
  for (const field of topLevelRequired) {
    checks.push(
      check(
        `top-level.${field}-present`,
        data[field] !== undefined && data[field] !== null,
        `Required top-level field '${field}' is missing`
      )
    );
  }

  // featureId matches argument
  if (data.featureId !== undefined) {
    checks.push(
      check(
        'featureId-matches-arg',
        data.featureId === featureId,
        `featureId '${data.featureId}' does not match argument '${featureId}'`
      )
    );
    checks.push(
      check(
        'featureId-format',
        FEATURE_ID_PATTERN.test(data.featureId),
        `featureId '${data.featureId}' does not match pattern feat-NNNN-slug`
      )
    );
  }

  // architectureVersion is a positive integer
  if (data.architectureVersion !== undefined) {
    checks.push(
      check(
        'architectureVersion-is-positive-int',
        Number.isInteger(data.architectureVersion) && data.architectureVersion >= 1,
        `architectureVersion must be a positive integer, got: ${data.architectureVersion}`
      )
    );
  }

  // tasks is a non-empty array
  if (data.tasks !== undefined) {
    checks.push(
      check(
        'tasks-is-array',
        Array.isArray(data.tasks),
        'tasks must be an array'
      )
    );
    if (Array.isArray(data.tasks)) {
      checks.push(
        check(
          'tasks-not-empty',
          data.tasks.length >= 1,
          'tasks array must have at least 1 item'
        )
      );
    }
  }

  // If tasks is valid array, validate each task
  if (Array.isArray(data.tasks) && data.tasks.length > 0) {
    const taskIds = new Set();

    for (let i = 0; i < data.tasks.length; i++) {
      const task = data.tasks[i];
      const prefix = `task[${i}]`;

      // id
      checks.push(
        check(
          `${prefix}.id-present`,
          typeof task.id === 'string' && task.id.length > 0,
          `Task at index ${i} missing 'id'`
        )
      );
      if (task.id) {
        checks.push(
          check(
            `${prefix}.id-format`,
            TASK_ID_PATTERN.test(task.id),
            `Task id '${task.id}' does not match pattern task-NNN`
          )
        );
        checks.push(
          check(
            `${prefix}.id-unique`,
            !taskIds.has(task.id),
            `Duplicate task id '${task.id}'`
          )
        );
        taskIds.add(task.id);
      }

      // title
      checks.push(
        check(
          `${prefix}.title-length`,
          typeof task.title === 'string' && task.title.length >= 5,
          `Task '${task.id}' title must be at least 5 characters`
        )
      );

      // phase
      checks.push(
        check(
          `${prefix}.phase-valid`,
          VALID_PHASES.includes(task.phase),
          `Task '${task.id}' phase '${task.phase}' must be one of: ${VALID_PHASES.join(', ')}`
        )
      );

      // status
      checks.push(
        check(
          `${prefix}.status-valid`,
          VALID_STATUSES.includes(task.status),
          `Task '${task.id}' status '${task.status}' must be one of: ${VALID_STATUSES.join(', ')}`
        )
      );

      // dependsOn
      checks.push(
        check(
          `${prefix}.dependsOn-is-array`,
          Array.isArray(task.dependsOn),
          `Task '${task.id}' dependsOn must be an array`
        )
      );

      // affectedFiles
      checks.push(
        check(
          `${prefix}.affectedFiles-is-array`,
          Array.isArray(task.affectedFiles),
          `Task '${task.id}' affectedFiles must be an array`
        )
      );
      checks.push(
        check(
          `${prefix}.affectedFiles-not-empty`,
          Array.isArray(task.affectedFiles) && task.affectedFiles.length >= 1,
          `Task '${task.id}' affectedFiles must have at least 1 file`
        )
      );
      if (Array.isArray(task.affectedFiles)) {
        const badPaths = task.affectedFiles.filter((f) => !String(f).startsWith('src/'));
        checks.push(
          check(
            `${prefix}.affectedFiles-under-src`,
            badPaths.length === 0,
            `Task '${task.id}' affectedFiles contains paths not under src/: ${badPaths.join(', ')}`
          )
        );
      }

      // contextFiles
      checks.push(
        check(
          `${prefix}.contextFiles-is-array`,
          Array.isArray(task.contextFiles),
          `Task '${task.id}' contextFiles must be an array`
        )
      );

      // instructions
      checks.push(
        check(
          `${prefix}.instructions-length`,
          typeof task.instructions === 'string' && task.instructions.length >= 20,
          `Task '${task.id}' instructions must be at least 20 characters`
        )
      );

      // acceptanceCriteria
      checks.push(
        check(
          `${prefix}.acceptanceCriteria-length`,
          typeof task.acceptanceCriteria === 'string' && task.acceptanceCriteria.length >= 10,
          `Task '${task.id}' acceptanceCriteria must be at least 10 characters`
        )
      );

      // estimatedComplexity
      checks.push(
        check(
          `${prefix}.estimatedComplexity-valid`,
          VALID_COMPLEXITIES.includes(task.estimatedComplexity),
          `Task '${task.id}' estimatedComplexity '${task.estimatedComplexity}' must be one of: ${VALID_COMPLEXITIES.join(', ')}`
        )
      );
    }

    // Validate dependsOn references exist
    for (const task of data.tasks) {
      if (!Array.isArray(task.dependsOn)) continue;
      for (const depId of task.dependsOn) {
        checks.push(
          check(
            `dep-ref-exists:${task.id}->${depId}`,
            taskIds.has(depId),
            `Task '${task.id}' dependsOn '${depId}' which does not exist in tasks array`
          )
        );
      }
    }

    // Check ordering: tasks with dependsOn must appear after their dependencies
    const taskIndexById = {};
    data.tasks.forEach((t, i) => { if (t.id) taskIndexById[t.id] = i; });

    for (const task of data.tasks) {
      if (!Array.isArray(task.dependsOn) || !task.id) continue;
      for (const depId of task.dependsOn) {
        if (!(depId in taskIndexById)) continue;
        checks.push(
          check(
            `dep-ordering:${task.id}-after-${depId}`,
            taskIndexById[task.id] > taskIndexById[depId],
            `Task '${task.id}' (index ${taskIndexById[task.id]}) must appear after its dependency '${depId}' (index ${taskIndexById[depId]})`
          )
        );
      }
    }

    // Cycle detection via DFS
    const adjacency = {};
    for (const task of data.tasks) {
      if (!task.id) continue;
      adjacency[task.id] = Array.isArray(task.dependsOn) ? task.dependsOn.filter((d) => taskIds.has(d)) : [];
    }

    const visited = new Set();
    const inStack = new Set();
    let hasCycle = false;
    let cycleDescription = '';

    function dfs(nodeId, path) {
      if (inStack.has(nodeId)) {
        hasCycle = true;
        const cycleStart = path.indexOf(nodeId);
        cycleDescription = path.slice(cycleStart).concat(nodeId).join(' → ');
        return;
      }
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      inStack.add(nodeId);
      path.push(nodeId);
      for (const dep of (adjacency[nodeId] || [])) {
        dfs(dep, path);
        if (hasCycle) return;
      }
      path.pop();
      inStack.delete(nodeId);
    }

    for (const id of taskIds) {
      if (!visited.has(id)) {
        dfs(id, []);
        if (hasCycle) break;
      }
    }

    checks.push(
      check(
        'no-dependency-cycles',
        !hasCycle,
        `Circular dependency detected: ${cycleDescription}`
      )
    );
  }

  const result = buildResult(checks);
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

function outputAndExit(result) {
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

const featureId = process.argv[2];
if (!featureId) {
  console.error('Usage: node validate-tasks.js <feature-id>');
  process.exit(2);
}

validate(featureId);
