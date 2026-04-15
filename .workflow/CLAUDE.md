# Workflow Engine — Authoritative Step-by-Step Logic

This file defines the complete, deterministic execution logic of the workflow pipeline. The `.claude/skills/workflow.md` skill delegates to this file. Follow every step exactly. Do not skip steps. Do not combine steps.

---

## Constants

```
MAX_RETRIES = 2          # Max retries per artifact (3 total attempts)
RUNS_DIR = .workflow/runs
CONTEXT_DIR = .workflow/context
AGENTS_DIR = .workflow/agents
VALIDATORS_DIR = .workflow/validators
TEMPLATES_DIR = .workflow/templates
```

---

## Triggering Condition

You are invoked via `/workflow "<feature description>"`.

`$ARGUMENTS` is either:
- A plain feature title/description string
- A path to an existing `request.md` file

---

## Phase 0: Bootstrap

**Goal**: Set up the feature's branch, directory, and initial state files.

### Step 0.1 — Generate FEATURE_ID

Generate `FEATURE_ID` using this algorithm:
1. Scan `.workflow/runs/` for existing directories. Find the highest `NNNN` value. If none, start at `0001`.
2. Increment by 1, zero-pad to 4 digits.
3. Slugify the feature title: lowercase, replace non-alphanumeric with `-`, collapse consecutive hyphens, strip leading/trailing hyphens, max 35 chars.
4. Result: `feat-{NNNN}-{slug}`. Example: `feat-0003-user-profile-settings`.

### Step 0.2 — Verify clean working tree

Run: `git status --porcelain`

If output is non-empty: **abort**. Tell the user:
```
Cannot start workflow: working tree has uncommitted changes.
Please commit or stash your changes before running /workflow.
```

### Step 0.3 — Verify on main branch

Run: `git branch --show-current`

If not `main`: warn the user but continue (allow running from a non-main branch for testing).

### Step 0.4 — Create feature branch

Run: `git checkout -b feature/{FEATURE_ID}`

### Step 0.5 — Create run directory

Create directory `.workflow/runs/{FEATURE_ID}/` and `eval/` subdirectory within it.

### Step 0.6 — Write request.md

Write `.workflow/runs/{FEATURE_ID}/request.md`:
```markdown
---
featureId: {FEATURE_ID}
receivedAt: {ISO 8601 timestamp}
---

# Feature Request: {FEATURE_ID}

## Original Request

{$ARGUMENTS — the raw input string, or the contents of the provided request.md file}
```

### Step 0.7 — Write initial pipeline-state.json

Write `.workflow/runs/{FEATURE_ID}/pipeline-state.json`:
```json
{
  "featureId": "{FEATURE_ID}",
  "phase": "knowledge",
  "retries": {},
  "startedAt": "{ISO 8601 timestamp}",
  "updatedAt": "{ISO 8601 timestamp}"
}
```

### Step 0.8 — Initial commit

Stage and commit all new files:
```
git add .workflow/runs/{FEATURE_ID}/
git commit -m "chore({FEATURE_ID}): bootstrap pipeline"
```

---

## Phase 1: Knowledge Snapshot

**Goal**: Distill relevant project context for this feature run.

### Step 1.1 — Invoke knowledge agent (snapshot mode)

Invoke the knowledge agent sub-agent with this prompt:

```
KNOWLEDGE_MODE=snapshot
FEATURE_ID={FEATURE_ID}

You are the knowledge agent operating in SNAPSHOT mode.
Read the agent specification at .workflow/agents/knowledge.md for full instructions.

Feature ID: {FEATURE_ID}
```

Allow the agent to run until it writes `.workflow/runs/{FEATURE_ID}/knowledge-snapshot.md`.

### Step 1.2 — Verify output exists

Check that `.workflow/runs/{FEATURE_ID}/knowledge-snapshot.md` exists. If not: abort with error "Knowledge agent failed to produce knowledge-snapshot.md".

### Step 1.3 — Commit

```
git add .workflow/runs/{FEATURE_ID}/knowledge-snapshot.md
git commit -m "chore({FEATURE_ID}): knowledge snapshot"
```

### Step 1.4 — Update pipeline-state.json

Update `phase` to `"requirements"`.

---

## Phase 2: Requirements

**Goal**: Produce a validated spec.md from the feature request.

### Step 2.1 — Invoke requirements agent

Invoke the requirements agent sub-agent:

```
FEATURE_ID={FEATURE_ID}

You are the requirements agent.
Read the agent specification at .workflow/agents/requirements.md for full instructions.

Feature ID: {FEATURE_ID}
```

Allow the agent to run until it writes `.workflow/runs/{FEATURE_ID}/spec.md`.

### Step 2.2 — Run deterministic gate (Stage 1)

```
node .workflow/validators/validate-spec.js {FEATURE_ID}
```

Parse the JSON output. If `passed` is false:
- Increment `retries.spec` in `pipeline-state.json`
- If `retries.spec >= MAX_RETRIES`: **escalate** (see Escalation Procedure)
- Re-invoke requirements agent with retry prompt (see Retry Prompt Format) → return to Step 2.1

### Step 2.3 — Run evaluator gate (Stage 2)

Invoke the evaluator agent:

```
EVAL_TYPE=spec
FEATURE_ID={FEATURE_ID}
TASK_ID=null
ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/spec.md
UPSTREAM_ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/request.md
EVAL_OUTPUT_PATH=.workflow/runs/{FEATURE_ID}/eval/spec-eval.json

You are the evaluator agent.
Read the agent specification at .workflow/agents/evaluator.md for full instructions.
```

Read `.workflow/runs/{FEATURE_ID}/eval/spec-eval.json`. If `passed` is false:
- Increment `retries.spec` in `pipeline-state.json`
- If `retries.spec >= MAX_RETRIES`: **escalate**
- Re-invoke requirements agent with retry prompt including evaluator's `retryGuidance` → return to Step 2.1

### Step 2.4 — Commit

```
git add .workflow/runs/{FEATURE_ID}/spec.md .workflow/runs/{FEATURE_ID}/eval/spec-eval.json
git commit -m "feat({FEATURE_ID}): requirements spec"
```

### Step 2.5 — Update pipeline-state.json

Update `phase` to `"architecture"`.

---

## Phase 3: Architecture

**Goal**: Produce a validated architecture.md and tasks.json.

### Step 3.1 — Invoke architecture agent

Invoke the architecture agent sub-agent:

```
FEATURE_ID={FEATURE_ID}

You are the architecture agent.
Read the agent specification at .workflow/agents/architecture.md for full instructions.

Feature ID: {FEATURE_ID}
```

Allow the agent to run until it writes both:
- `.workflow/runs/{FEATURE_ID}/architecture.md`
- `.workflow/runs/{FEATURE_ID}/tasks.json`

### Step 3.2 — Run deterministic gates

Run both validators:
```
node .workflow/validators/validate-architecture.js {FEATURE_ID}
node .workflow/validators/validate-tasks.js {FEATURE_ID}
```

If either fails:
- Increment `retries.architecture` in `pipeline-state.json`
- If `retries.architecture >= MAX_RETRIES`: **escalate**
- Re-invoke architecture agent with retry prompt → return to Step 3.1

### Step 3.3 — Run evaluator gate for architecture.md

```
EVAL_TYPE=architecture
ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/architecture.md
UPSTREAM_ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/spec.md
EVAL_OUTPUT_PATH=.workflow/runs/{FEATURE_ID}/eval/architecture-eval.json
```

If `passed` is false: retry logic as above.

### Step 3.4 — Run evaluator gate for tasks.json

```
EVAL_TYPE=tasks
ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/tasks.json
UPSTREAM_ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/architecture.md
EVAL_OUTPUT_PATH=.workflow/runs/{FEATURE_ID}/eval/tasks-eval.json
```

If `passed` is false: increment `retries.tasks`, retry or escalate.

### Step 3.5 — Commit

```
git add .workflow/runs/{FEATURE_ID}/architecture.md \
        .workflow/runs/{FEATURE_ID}/tasks.json \
        .workflow/runs/{FEATURE_ID}/eval/architecture-eval.json \
        .workflow/runs/{FEATURE_ID}/eval/tasks-eval.json
git commit -m "feat({FEATURE_ID}): architecture + task breakdown"
```

### Step 3.6 — Update pipeline-state.json

Update `phase` to `"coding"`.

---

## Phase 4: Coding

**Goal**: Implement all tasks in order, one at a time.

### Step 4.1 — Read task list

Read `.workflow/runs/{FEATURE_ID}/tasks.json`. Get the ordered list of tasks.

### Step 4.2 — For each task (in array order)

Repeat the following steps for each task where `status == "pending"`:

#### Step 4.2.1 — Mark task in_progress

Update the task's `status` to `"in_progress"` in `tasks.json`. Commit:
```
git add .workflow/runs/{FEATURE_ID}/tasks.json
git commit -m "chore({FEATURE_ID}): start {TASK_ID}"
```

#### Step 4.2.2 — Invoke coding agent

Invoke the coding agent sub-agent with:

```
FEATURE_ID={FEATURE_ID}
TASK_ID={TASK_ID}
TASK_OBJECT={the full JSON object for this task, stringified}

You are the coding agent.
Read the agent specification at .workflow/agents/coding.md for full instructions.
```

Allow the agent to run until it has modified/created all files in `affectedFiles`.

#### Step 4.2.3 — Run deterministic code gate

```
node .workflow/validators/validate-code.js {FEATURE_ID} {TASK_ID}
```

If `passed` is false:
- Increment `retries.{TASK_ID}` in `pipeline-state.json`
- If `retries.{TASK_ID} >= MAX_RETRIES`: **escalate** (mark task `"blocked"`)
- Re-invoke coding agent with retry prompt → return to Step 4.2.2

#### Step 4.2.4 — Run evaluator gate for this task

```
EVAL_TYPE=code-task
FEATURE_ID={FEATURE_ID}
TASK_ID={TASK_ID}
ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/tasks.json
UPSTREAM_ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/architecture.md
EVAL_OUTPUT_PATH=.workflow/runs/{FEATURE_ID}/eval/code-eval-{TASK_ID}.json
```

If `passed` is false: retry logic as above.

#### Step 4.2.5 — Mark task done and commit

Update task `status` to `"done"` in `tasks.json`.

Append to `.workflow/runs/{FEATURE_ID}/coding-log.md`:
```markdown
## {TASK_ID}: {task.title}
- **Completed**: {ISO 8601 timestamp}
- **Affected files**: {comma-separated list}
- **Eval score**: {score from eval JSON}
- **Notes**: {any notable decisions or deviations from instructions}
```

Stage all changed files and commit:
```
git add {all files in task.affectedFiles}
git add .workflow/runs/{FEATURE_ID}/tasks.json
git add .workflow/runs/{FEATURE_ID}/coding-log.md
git add .workflow/runs/{FEATURE_ID}/eval/code-eval-{TASK_ID}.json
git commit -m "feat({FEATURE_ID}): implement {TASK_ID} — {task.title}"
```

### Step 4.3 — Update pipeline-state.json

After all tasks complete, update `phase` to `"integration-eval"`.

---

## Phase 5: Integration Eval

**Goal**: Verify the full feature cohesively implements the spec.

### Step 5.1 — Invoke evaluator agent (integration)

```
EVAL_TYPE=integration
FEATURE_ID={FEATURE_ID}
ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/tasks.json
UPSTREAM_ARTIFACT_PATH=.workflow/runs/{FEATURE_ID}/spec.md
EVAL_OUTPUT_PATH=.workflow/runs/{FEATURE_ID}/eval/code-eval.json
```

The evaluator agent should read:
- spec.md (all FRs and ACs)
- architecture.md (intended design)
- All files in all tasks' `affectedFiles` (the actual implementation)

### Step 5.2 — Check result

If `passed` is false: **escalate immediately** — no retry at integration level. Structural issues at this stage require human judgment.

### Step 5.3 — Commit

```
git add .workflow/runs/{FEATURE_ID}/eval/code-eval.json
git commit -m "chore({FEATURE_ID}): integration eval passed"
```

### Step 5.4 — Update pipeline-state.json

Update `phase` to `"knowledge-update"`.

---

## Phase 6: Knowledge Update

**Goal**: Persist new knowledge gained during this feature run.

### Step 6.1 — Invoke knowledge agent (update mode)

```
KNOWLEDGE_MODE=update
FEATURE_ID={FEATURE_ID}

You are the knowledge agent operating in UPDATE mode.
Read the agent specification at .workflow/agents/knowledge.md for full instructions.

Feature ID: {FEATURE_ID}
```

Allow agent to append to context files and update projectOverview.md.

### Step 6.2 — Commit knowledge updates

```
git add .workflow/context/
git commit -m "chore({FEATURE_ID}): knowledge base updated"
```

### Step 6.3 — Update pipeline-state.json

Update `phase` to `"pr"`.

---

## Phase 7: Pull Request

**Goal**: Push branch and open PR for human review.

### Step 7.1 — Push branch

```
git push origin feature/{FEATURE_ID}
```

### Step 7.2 — Build PR body

Read `.workflow/templates/pr-body.md.template`.

Populate substitutions by reading:
- `FEATURE_TITLE`: from spec.md frontmatter title or request.md
- `FEATURE_ID`: `{FEATURE_ID}`
- `SPEC_SUMMARY`: Summary section from spec.md
- `FR_LIST`: Functional Requirements section from spec.md
- `AC_LIST`: Acceptance Criteria section from spec.md
- `OUT_OF_SCOPE_LIST`: Out of Scope section from spec.md
- `APPROACH_PARAGRAPH`: Approach section from architecture.md
- `FILES_CHANGED_LIST`: All unique files from all tasks' `affectedFiles`
- `SPEC_SCORE` / `SPEC_STATUS`: from eval/spec-eval.json
- `ARCH_SCORE` / `ARCH_STATUS`: from eval/architecture-eval.json
- `TASKS_SCORE` / `TASKS_STATUS`: from eval/tasks-eval.json
- `INT_SCORE` / `INT_STATUS`: from eval/code-eval.json
- `OPEN_QUESTIONS_LIST`: Open Questions section from spec.md

### Step 7.3 — Create PR

```
gh pr create \
  --title "feat({FEATURE_ID}): {FEATURE_TITLE}" \
  --body "{populated PR body}" \
  --base main \
  --head feature/{FEATURE_ID}
```

### Step 7.4 — Finalize

Update `pipeline-state.json`: `phase` to `"complete"`.

Commit:
```
git add .workflow/runs/{FEATURE_ID}/pipeline-state.json
git commit -m "chore({FEATURE_ID}): pipeline complete"
```

Output to user:
```
Pipeline complete for {FEATURE_ID}.
PR: {PR URL}
```

---

## Retry Prompt Format

When re-invoking an agent after a gate failure, append this section to the standard agent prompt:

```markdown
## Previous Attempt Failed

The previous output did not pass the gate. Address every issue below before producing a new output.

### Deterministic Validator Issues
{paste the full JSON output from the validator, if Stage 1 failed}

### Evaluator Feedback
{paste the retryGuidance string from the eval JSON, if Stage 2 failed}

---

Fix the issues above. Do not change parts of the artifact that were not flagged. Produce a complete, corrected output.
```

---

## Escalation Procedure

Triggered when: retries for an artifact reach `MAX_RETRIES`, OR integration eval fails.

### Steps:

1. Update `pipeline-state.json`: set `phase` to `"blocked"`, add `"blockedAt"` timestamp and `"blockedReason"` string.

2. Write `.workflow/runs/{FEATURE_ID}/blocking-issue.md`:
```markdown
# Pipeline Blocked: {FEATURE_ID}

**Phase**: {current phase}
**Blocked at**: {ISO 8601 timestamp}
**Reason**: Gate failed after {MAX_RETRIES + 1} attempts.

## Last Validator Output
{paste validator JSON}

## Last Evaluator Output
{paste eval JSON}

## Last Retry Guidance
{paste retryGuidance}

## Suggested Human Actions
1. Review the artifact at `.workflow/runs/{FEATURE_ID}/{artifact}`
2. Either: (a) manually edit the artifact and run `/workflow-retry {FEATURE_ID}`, or (b) revise the feature request and restart
```

3. Commit:
```
git add .workflow/runs/{FEATURE_ID}/
git commit -m "chore({FEATURE_ID}): pipeline blocked at {phase}"
```

4. Push: `git push origin feature/{FEATURE_ID}`

5. Open GitHub issue:
```
gh issue create \
  --title "[WORKFLOW BLOCKED] {FEATURE_ID} — {phase} gate failed after 3 attempts" \
  --body "{contents of blocking-issue.md}" \
  --label "workflow-blocked"
```

6. Output to user:
```
Pipeline blocked for {FEATURE_ID} at phase: {phase}.
Issue: {issue URL}
See .workflow/runs/{FEATURE_ID}/blocking-issue.md for details.
```

**Stop execution. Do not proceed.**

---

## State Recovery (/workflow-retry)

See `.claude/skills/workflow-retry.md` for the retry skill. It:
1. Reads `pipeline-state.json` to find current phase
2. Resumes execution from the current phase (does not re-run completed phases)
3. Resets the retry counter for the blocked artifact to 0

---

## Important Rules

1. **Never skip a commit.** Every phase that produces an artifact commits before proceeding.
2. **Never modify application code (src/) directly.** Only the coding agent modifies source files.
3. **Never modify `.workflow/context/` files during phases 0–6.** Only the knowledge agent (phase 6) updates them.
4. **Agents produce artifacts; the engine moves them.** The engine stages and commits; agents only read and write files.
5. **pipeline-state.json is always up to date.** Update it at the end of every phase.
6. **On any unexpected error** (file not found, git failure, etc.): output the error, abort, tell the user what happened and what to do to recover.
