# workflow-template

This is useless now with current models with their much higher quality.

A reusable multi-agent development pipeline for Claude Code. Drop this into any repo to get a structured, traceable feature development workflow.

## What's included

- **5 specialized agents**: requirements, architecture, coding, knowledge, evaluator
- **4 deterministic validators**: spec, architecture, tasks, code (ESLint + TypeScript)
- **3 Claude Code skills**: `/workflow`, `/workflow-status`, `/workflow-retry`
- **Git-native state**: every phase commits, every feature is a branch, every ship is a PR
- **Hybrid eval gates**: schema checks first, LLM quality scoring second

## How to use this template

### 1. Create your repo from this template

Click **Use this template** → **Create a new repository** on GitHub.

### 2. Fill in two files

**`.workflow/context/projectOverview.md`** — describe your project, stack, and constraints. Every agent reads this first.

**`CLAUDE.md`** — your code conventions. The coding agent follows these literally.

### 3. Make an initial commit to `main`

```bash
git add .
git commit -m "chore: initialize project with workflow system"
git push origin main
```

### 4. Run your first feature

```
/workflow "Your first feature description"
```

The pipeline creates a branch, runs requirements → architecture → coding → eval → PR automatically.

## Pipeline overview

```
/workflow "feature"  →  spec.md  →  architecture.md + tasks.json  →  code (per task)  →  PR
                           ↑ gate        ↑ gate                         ↑ gate per task
```

Each gate = deterministic validator (Node.js) + evaluator agent (LLM quality score).  
On gate failure: automatic retry up to 2×, then GitHub issue opened for human review.

## Slots to customize per project

| File | What to change |
|------|----------------|
| `.workflow/context/projectOverview.md` | Project purpose, stack, structure, constraints |
| `CLAUDE.md` | Language, framework, coding style, test commands |
| `.workflow/validators/validate-code.js` | Swap ESLint/tsc for your linter/type checker |

Everything else (agents, templates, engine, skills) works out of the box for any project.

## Commands

| Command | What it does |
|---------|-------------|
| `/workflow "description"` | Run the full pipeline for a new feature |
| `/workflow-status feat-NNNN-slug` | Check the current state of a pipeline run |
| `/workflow-retry feat-NNNN-slug` | Resume a blocked or interrupted run |

## Learn more

See `.workflow/README.md` for full pipeline documentation.
