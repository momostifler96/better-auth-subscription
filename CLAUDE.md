# Claude Code Guidelines

## Workflow

**After completing work on code changes, ALWAYS:**
1. Run `npm run typecheck` to verify TypeScript types
2. Run `npm run build` to ensure the build succeeds
3. Only commit after both checks pass

This ensures type safety and build integrity before any commit is made to the repository.
