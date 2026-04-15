#!/usr/bin/env node
/**
 * validate-spec.js
 * Deterministic validator for spec.md artifacts.
 *
 * Usage: node validate-spec.js <feature-id>
 * Exit 0: pass. Exit 1: fail (JSON to stdout).
 */

const fs = require('fs');
const path = require('path');
const { parseMarkdown, countMatches } = require('./lib/markdown-parser');
const { buildResult, check, requiredFields } = require('./lib/schema-checker');

const REQUIRED_SECTIONS = [
  'Summary',
  'Functional Requirements',
  'Non-Functional Requirements',
  'Out of Scope',
  'Acceptance Criteria',
  'Open Questions',
  'Dependencies',
  'Assumptions',
];

const REQUIRED_FM_FIELDS = ['featureId', 'version', 'status', 'createdAt'];

function validate(featureId) {
  const specPath = path.join(
    process.cwd(),
    '.workflow', 'runs', featureId, 'spec.md'
  );

  const checks = [];

  // File existence
  const fileExists = fs.existsSync(specPath);
  checks.push(check('file-exists', fileExists, `spec.md not found at ${specPath}`));
  if (!fileExists) {
    const result = buildResult(checks);
    process.stdout.write(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const content = fs.readFileSync(specPath, 'utf8');
  const { frontmatter, sections } = parseMarkdown(content);

  // Frontmatter fields
  checks.push(...requiredFields(frontmatter, REQUIRED_FM_FIELDS, 'frontmatter'));

  // featureId matches argument
  checks.push(
    check(
      'frontmatter.featureId-matches-arg',
      frontmatter.featureId === featureId,
      `frontmatter featureId '${frontmatter.featureId}' does not match argument '${featureId}'`
    )
  );

  // Required sections present
  for (const section of REQUIRED_SECTIONS) {
    checks.push(
      check(
        `section-present:${section}`,
        section in sections,
        `Required section '## ${section}' is missing`
      )
    );
  }

  // Sections not empty (after stripping comments)
  for (const section of REQUIRED_SECTIONS) {
    if (!(section in sections)) continue;
    const body = sections[section];
    checks.push(
      check(
        `section-not-empty:${section}`,
        body.length > 0,
        `Section '## ${section}' is empty after stripping comments`
      )
    );
  }

  // Functional Requirements: at least one FR-N: entry (with or without leading bullet)
  if (sections['Functional Requirements']) {
    const frCount = countMatches(sections['Functional Requirements'], /^\s*(?:- )?FR-\d+:/m);
    checks.push(
      check(
        'fr-count-minimum',
        frCount >= 1,
        `Functional Requirements must have at least 1 FR-N: entry, found ${frCount}`
      )
    );

    // Acceptance Criteria: count >= FR count
    if (sections['Acceptance Criteria']) {
      const acCount = countMatches(sections['Acceptance Criteria'], /^\s*(?:- )?AC-\d+/m);
      checks.push(
        check(
          'ac-count-gte-fr-count',
          acCount >= frCount,
          `Acceptance Criteria count (${acCount}) must be >= Functional Requirements count (${frCount})`
        )
      );
    }
  }

  // No placeholder text remaining
  const hasPlaceholder = content.includes('FEATURE_ID_PLACEHOLDER') ||
    content.includes('FEATURE_TITLE_PLACEHOLDER') ||
    content.includes('TIMESTAMP_PLACEHOLDER');
  checks.push(
    check(
      'no-template-placeholders',
      !hasPlaceholder,
      'File still contains template placeholders (FEATURE_ID_PLACEHOLDER, etc.)'
    )
  );

  const result = buildResult(checks);
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

const featureId = process.argv[2];
if (!featureId) {
  console.error('Usage: node validate-spec.js <feature-id>');
  process.exit(2);
}

validate(featureId);
