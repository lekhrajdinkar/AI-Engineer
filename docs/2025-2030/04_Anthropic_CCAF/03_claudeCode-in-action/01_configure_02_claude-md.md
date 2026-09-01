# Writing a CLAUDE.md That Claude Actually Follows
> - https://www.youtube.com/watch?v=sfE5UQEumdM
> - https://anthropic.skilljar.com/claude-code-in-action/486929

## Core Concept
* **Guidance vs. Enforcement:** `CLAUDE.md` provides soft guidance, not strict enforcement. Every line competes for attention.
* **Keep It Lean:** The shorter and more focused the file, the more reliably Claude adheres to its instructions.

## 1. Tool Selection: Guidance vs. Hooks
* **Guidance (`CLAUDE.md`):** Conventions, code style, and preferred practices.
* **Hard Enforcement (Hooks):** Critical guardrails (e.g., "never push to `main`") belong in **pre-tool-use hooks** that physically block unauthorized actions.

## 2. Four Configuration Locations
* **Managed Policy:** Org-level rules managed by platform teams (always active).
* **User:** Global user preferences applied across all projects.
* **Project:** Team-wide conventions committed to Git repository root.
* **Local:** Ignored by Git (`.git/info/exclude` or `.gitignore`); used for personal, branch-specific notes.

## 3. Organizing with Imports
* **Syntax:** Split large files using file imports (e.g., `@.claude/conventions/testing.md`).
* **Context Impact:** Imports expand inline at startup; they improve human organization but **do not** reduce token load for Claude.

## 4. Rule Phrasing Best Practices
* **Specific & Checkable:** Use objective requirements instead of vague standards (e.g., `"Put new API routes in src/api/handlers, one per file"` vs. `"Follow best practices"`).
* **Name the Replacement:** State what to use rather than just what to avoid (e.g., `"Use named exports, not default exports"`).
* **Emphasis Budget:** Reserve strong emphasis (e.g., `MUST`, `IMPORTANT`) for critical rules so they don't lose impact.

## 5. Maintenance
* **Treat as Living Code:** Treat Claude's mistakes as bug reports against `CLAUDE.md`.
* **Iterate Directly:** Tell Claude to update `CLAUDE.md` after correcting recurring errors.

## Summary
> Treat your CLAUDE.md like production code. If you can't justify a line, delete it. To keep the file lean and followable:
```
Move hard rules to hooks, where they're actually enforced.
Organize long files with imports (just remember they don't reduce context).
Make every rule specific and checkable, and name the replacement.
Spend your emphasis budget on the few rules that matter most.
Keep revising the file whenever Claude gets something wrong.
```