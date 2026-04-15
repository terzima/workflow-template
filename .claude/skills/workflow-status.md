---
description: Show the current status of a workflow pipeline run. Prints phase, retry counts, eval scores, and task statuses.
argument-hint: "<feature-id>"
allowed-tools: Read, Glob
---

# /workflow-status

Show the current status of a pipeline run.

## Input

`$ARGUMENTS` — a feature ID (e.g., `feat-0001-portfolio-homepage`). If omitted, find the most recently modified run directory under `.workflow/runs/`.

## What to display

Read and summarize:

1. `.workflow/runs/{FEATURE_ID}/pipeline-state.json`
   - Current phase
   - Start time and duration so far
   - Retry counts per artifact
   - Blocked status if applicable

2. `.workflow/runs/{FEATURE_ID}/tasks.json` (if it exists)
   - Table of tasks with ID, title, status, complexity

3. All eval files under `.workflow/runs/{FEATURE_ID}/eval/`
   - Artifact, score, passed/failed

4. `.workflow/runs/{FEATURE_ID}/blocking-issue.md` (if it exists)
   - Summary of what blocked the pipeline

## Output format

Use a clean, scannable format. Example:

```
Feature: feat-0001-portfolio-homepage
Phase:   coding (started 2026-04-13 17:00, ~45 min ago)
Branch:  feature/feat-0001-portfolio-homepage

EVALUATIONS
  spec.md          score=85  PASSED
  architecture.md  score=78  PASSED
  tasks.json       score=82  PASSED

TASKS
  task-001  done    (small)  Add Tailwind design tokens
  task-002  done    (medium) Build Nav component
  task-003  in_progress (medium) Build Hero section
  task-004  pending  (large)  Build homepage layout

RETRIES
  task-003: 1 attempt so far
```
