#!/usr/bin/env node
/**
 * validate-architecture.js
 * Deterministic validator for architecture.md artifacts.
 *
 * Usage: node validate-architecture.js <feature-id>
 * Exit 0: pass. Exit 1: fail (JSON to stdout).
 */

const fs = require('fs');
const path = require('path');
const { parseMarkdown } = require('./lib/markdown-parser');
const { buildResult, check, requiredFields } = require('./lib/schema-checker');

const REQUIRED_SECTIONS = [
  'Approach',
  'Technology Decisions',
  'Component Map',
  'Data Flow',
  'Test Strategy',
];

const REQUIRED_FM_FIELDS = ['featureId', 'specVersion', 'version', 'createdAt'];

function validate(featureId) {
  const runDir = path.join(process.cwd(), '.workflow', 'runs', featureId);
  const archPath = path.join(runDir, 'architecture.md');
  const specPath = path.join(runDir, 'spec.md');

  const checks = [];

  // File existence
  const fileExists = fs.existsSync(archPath);
  checks.push(check('file-exists', fileExists, `architecture.md not found at ${archPath}`));
  if (!fileExists) {
    const result = buildResult(checks);
    process.stdout.write(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const content = fs.readFileSync(archPath, 'utf8');
  const { frontmatter, sections } = parseMarkdown(content);

  // Frontmatter fields
  checks.push(...requiredFields(frontmatter, REQUIRED_FM_FIELDS, 'frontmatter'));

  // featureId matches
  checks.push(
    check(
      'frontmatter.featureId-matches-arg',
      frontmatter.featureId === featureId,
      `frontmatter featureId '${frontmatter.featureId}' does not match '${featureId}'`
    )
  );

  // specVersion matches spec.md version
  if (fs.existsSync(specPath)) {
    const specContent = fs.readFileSync(specPath, 'utf8');
    const { frontmatter: specFm } = parseMarkdown(specContent);
    checks.push(
      check(
        'specVersion-matches-spec',
        frontmatter.specVersion === specFm.version,
        `architecture specVersion '${frontmatter.specVersion}' does not match spec.md version '${specFm.version}'`
      )
    );
  } else {
    checks.push(check('spec-exists', false, 'spec.md not found — cannot validate specVersion'));
  }

  // Required sections present and non-empty
  for (const section of REQUIRED_SECTIONS) {
    checks.push(
      check(
        `section-present:${section}`,
        section in sections,
        `Required section '## ${section}' is missing`
      )
    );
    if (section in sections) {
      checks.push(
        check(
          `section-not-empty:${section}`,
          sections[section].length > 0,
          `Section '## ${section}' is empty`
        )
      );
    }
  }

  // Must have Files to Create OR Files to Modify (or both)
  const hasCreate = 'Files to Create' in sections;
  const hasModify = 'Files to Modify' in sections;
  checks.push(
    check(
      'files-section-present',
      hasCreate || hasModify,
      "Must have at least one of '## Files to Create' or '## Files to Modify' sections"
    )
  );

  // All file paths in Files to Create and Files to Modify must start with src/
  const filePathRegex = /`((?!src\/).+?)`/g;
  for (const sectionName of ['Files to Create', 'Files to Modify']) {
    if (!sections[sectionName]) continue;
    const sectionContent = sections[sectionName];
    // Find backtick-quoted paths that do NOT start with src/
    const badPaths = [];
    let m;
    const backtickPaths = /`([^`]+\.[a-z]+)`/g;
    while ((m = backtickPaths.exec(sectionContent)) !== null) {
      const p = m[1];
      // Skip if it's clearly not a file path (no extension or starts with src/)
      if (p.startsWith('src/')) continue;
      if (p.startsWith('.workflow/') || p.startsWith('.claude/')) continue;
      if (!p.includes('/')) continue; // likely not a path
      badPaths.push(p);
    }
    checks.push(
      check(
        `file-paths-under-src:${sectionName}`,
        badPaths.length === 0,
        `File paths in '## ${sectionName}' must be under src/. Offending paths: ${badPaths.join(', ')}`
      )
    );
  }

  // No placeholder text
  const hasPlaceholder = content.includes('FEATURE_ID_PLACEHOLDER') ||
    content.includes('FEATURE_TITLE_PLACEHOLDER') ||
    content.includes('SPEC_VERSION_PLACEHOLDER') ||
    content.includes('TIMESTAMP_PLACEHOLDER');
  checks.push(
    check(
      'no-template-placeholders',
      !hasPlaceholder,
      'File still contains template placeholders'
    )
  );

  const result = buildResult(checks);
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

const featureId = process.argv[2];
if (!featureId) {
  console.error('Usage: node validate-architecture.js <feature-id>');
  process.exit(2);
}

validate(featureId);
