---
description: Resume a blocked workflow pipeline run from the phase where it failed. Use after manually fixing a blocked artifact or when the pipeline was interrupted.
argument-hint: "<feature-id>"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, TodoWrite
---

# /workflow-retry

Resume a blocked or interrupted pipeline run.

## Input

`$ARGUMENTS` — a feature ID (e.g., `feat-0001-portfolio-homepage`).

## Steps

1. Read `.workflow/runs/{FEATURE_ID}/pipeline-state.json`
   - Identify `phase` (where it blocked or stopped)
   - Note `retries` object

2. Read `.workflow/CLAUDE.md` to understand the full pipeline

3. Check the current git branch. If not on `feature/{FEATURE_ID}`, run:
   ```
   git checkout feature/{FEATURE_ID}
   ```

4. Reset the retry counter for the blocked artifact:
   - Find the artifact key in `retries` that reached `MAX_RETRIES`
   - Set it back to 0 in `pipeline-state.json`
   - Commit: `chore({FEATURE_ID}): reset retry counter for {artifact}`

5. Resume execution from the current `phase` in `.workflow/CLAUDE.md`
   - Do not re-run phases that already have passing evals
   - Start at the first un-committed step of the current phase

## Important

If the artifact was manually fixed before calling `/workflow-retry`:
- The deterministic validator will run again on the existing file
- If it now passes, the pipeline continues normally
- If it still fails, the retry counter applies again (max `MAX_RETRIES` new attempts)

If the pipeline was interrupted mid-phase (not blocked):
- Check `coding-log.md` and `tasks.json` to see which task was in progress
- Resume from that task
