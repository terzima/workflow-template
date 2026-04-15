# Workflow System

This directory contains the multi-agent pipeline that builds features in this repo. It is **not** application code.

## What It Does

Every feature goes through a deterministic pipeline:

```
/workflow "Feature description"
       │
       ▼
Phase 0: Bootstrap (branch, pipeline-state.json)
       │
       ▼
Phase 1: Knowledge Snapshot (distill relevant context)
       │
       ▼
Phase 2: Requirements Agent → spec.md
         └─ Gate: validate-spec.js → evaluator agent
       │
       ▼
Phase 3: Architecture Agent → architecture.md + tasks.json
         └─ Gate: validate-architecture.js + validate-tasks.js → evaluator agent
       │
       ▼
Phase 4: Coding Agent (loop per task) → code changes
         └─ Gate per task: validate-code.js → evaluator agent
       │
       ▼
Phase 5: Integration Eval (full feature review)
       │
       ▼
Phase 6: Knowledge Update (append assumptions, decisions, glossary)
       │
       ▼
Phase 7: PR opened → human review
```

## Key Principles

1. **Git is the state store.** Every phase commits. Branch per feature. Repo is the source of truth.
2. **Agents communicate through files.** No shared context windows. Each agent receives only what it needs.
3. **Hybrid gates.** Deterministic checks (Node.js scripts) first, then evaluator agent for quality.
4. **Human entry at PR only** (or if a gate fails after 3 attempts — a GitHub issue is opened).
5. **Token management.** Coding agent receives one task at a time with minimal context.

## Running a Feature

```
/workflow "Add user authentication"
/workflow-status feat-0001-user-auth
/workflow-retry feat-0001-user-auth
```

## Directory Structure

```
.workflow/
├── README.md              # This file
├── CLAUDE.md              # Step-by-step engine execution logic
├── agents/                # Agent prompt files
├── validators/            # Deterministic Node.js validation scripts
├── templates/             # Canonical artifact templates and schemas
├── context/               # Persistent project knowledge (on main branch)
└── runs/                  # Per-feature runtime artifacts (on feature branches)
```

## Setup Checklist (do this once after cloning the template)

- [ ] Fill in `.workflow/context/projectOverview.md` with your project details
- [ ] Fill in `CLAUDE.md` with your project's code conventions
- [ ] Make your first commit to `main` with these files
- [ ] Run `/workflow "your first feature"` to start the pipeline
