---
project: YOUR_PROJECT_NAME
lastUpdated: YYYY-MM-DD
version: 1
---

# {Project Name} — Project Overview

<!-- 
  INSTRUCTIONS: Fill in every section before running /workflow for the first time.
  This file is read by every agent at the start of each pipeline run.
  The more detail here, the better the agent output will be.
-->

## Purpose
<!-- What does this project do and who is it for? 2-3 sentences. -->

## Technology Stack
<!-- List the exact runtime, language, frameworks, libraries, deployment target. -->
- Runtime: 
- Language: 
- Framework(s): 
- Key libraries: 
- Database: 
- Deployment: 

## Repository Structure
<!-- Describe the top-level directories and their purpose. -->
```
/
├── .workflow/          # Multi-agent pipeline system (do not edit manually)
├── CLAUDE.md           # Code conventions for this project
└── src/                # Application source code
```

## Code Conventions
<!-- What conventions must every agent follow? Reference CLAUDE.md or list them here. -->
See `CLAUDE.md` at repo root.

## Deployment
<!-- How is this project built and deployed? -->

## Known Constraints
<!-- Performance limits, API rate limits, security requirements, budget constraints, etc. -->

## Active Features (completed)
<!-- Updated by workflow engine after each PR merges -->
_(none yet)_

## Workflow System
This repo uses a multi-agent pipeline for all feature development. See `.workflow/README.md` for documentation. Features are developed on `feature/{FEATURE_ID}` branches and merged via PR. Do not commit directly to `main` for feature work.
