# {Project Name} — Code Conventions

<!--
  INSTRUCTIONS: Replace this file with your project's actual conventions.
  This file is read by the coding agent before implementing any task.
  Be explicit — the agent follows these rules literally.
-->

## Stack
- Language: 
- Framework: 
- Key libraries: 
- Package manager: 

## Code Style

### General
- No `any` types (TypeScript) or equivalent dynamic typing shortcuts
- Explicit return types on all exported functions
- Use project-specific import aliases (e.g. `@/` for internal imports)
- Meaningful variable names — no single-letter names outside of loop indices

### Error Handling
- Never swallow errors silently
- Log errors in development, surface to user in production
- Use typed error handling where possible

### Files
- Lowercase kebab-case filenames
- One module/component per file where practical
- File name matches the default export

### Testing
- Type-check command: `npm run type-check` (or equivalent)
- Lint command: `npm run lint`
- Test command: `npm test`

## Workflow System
The `.workflow/` directory contains the multi-agent pipeline. Do not modify `.workflow/` files manually — they are maintained by the workflow engine.
