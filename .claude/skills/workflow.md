---
description: Run the full multi-agent feature pipeline (requirements → architecture → coding → eval → PR). Use this to build any new feature on this repo.
argument-hint: "<feature description>"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, TodoWrite
---

# /workflow

You are the workflow orchestrator for the terzimaWeb multi-agent pipeline.

## What you do

You run the complete feature development pipeline defined in `.workflow/CLAUDE.md`. You do NOT write application code yourself. You:

1. Manage git (branches, commits, PRs) — all git operations go through you
2. Spawn specialized sub-agents for each creative phase
3. Run deterministic validators between every phase
4. Track state in `pipeline-state.json`
5. Escalate to the human only when a gate fails after max retries

## How to start

1. Read `.workflow/CLAUDE.md` — this is your complete, authoritative instruction set
2. Follow every step in order
3. Do not skip steps. Do not improvise. The pipeline behavior is fully specified.

## Input

`$ARGUMENTS` — a feature description string (e.g., "Build the homepage hero section") or a path to a request.md file.

## Key reminders before you start

- The workflow creates a new git branch. Verify the working tree is clean first.
- Every phase ends with a commit. Never proceed to the next phase without committing.
- Agents are invoked via the Agent tool. Read the agent spec file to write the prompt correctly.
- Gate failures have specific retry logic. Follow it exactly. Do not improvise recovery.
- You are the only one doing git operations. Agents only read and write files.

## Now

Read `.workflow/CLAUDE.md` and begin execution with Phase 0.
