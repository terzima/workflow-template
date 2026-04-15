# Glossary

Domain terms, acronyms, and project-specific names used across workflow artifacts.

Format for new entries:
```
## {Term}
{Definition}
```

---

## Feature
A discrete unit of work processed through the full pipeline (requirements → architecture → coding → PR). Identified by a `feat-{NNNN}-{slug}` ID.

## Feature ID
The canonical identifier for a feature run. Format: `feat-{NNNN}-{slug}`. Example: `feat-0001-user-auth`. Used in branch names, commit messages, and run directory names.

## Pipeline
The multi-agent workflow that transforms a feature request into a merged PR. Defined in `.workflow/CLAUDE.md`.

## Artifact
A file produced by an agent as output of a pipeline phase. Examples: `spec.md`, `architecture.md`, `tasks.json`.

## Gate
A validation checkpoint between pipeline phases. Consists of Stage 1 (deterministic Node.js checks) and Stage 2 (evaluator agent quality score). Both must pass before the phase commits and the next phase begins.

## Knowledge Snapshot
A distilled summary of project context relevant to a specific feature, written by the knowledge agent at pipeline start. Lives at `.workflow/runs/{feature-id}/knowledge-snapshot.md`.

<!-- Project-specific terms will be appended here by the knowledge agent after each feature run. -->
