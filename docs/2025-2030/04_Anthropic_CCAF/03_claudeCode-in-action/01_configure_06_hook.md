# Hooks in Claude Code
> - https://www.youtube.com/watch?v=8ALu1dk681s
> - https://anthropic.skilljar.com/claude-code-in-action/486933

## Core Concept
* **Guaranteed Enforcement:** While `CLAUDE.md` provides soft guidance, **hooks** run deterministic code at fixed points in the loop, turning rules from *"Claude usually listens"* into *"Claude cannot skip it."*

## 1. Key Hook Events

| Event | Timing | Typical Use Case |
| :--- | :--- | :--- |
| **`PreToolUse`** | Before a tool executes | Primary enforcement: validate, rewrite, or block tool calls. |
| **`PostToolUse`** | After a successful tool execution | Run automated linters or code formatters. |
| **`Stop` / `SubagentStop`** | When Claude (or a subagent) attempts to end its turn | Prevent premature completion until criteria (e.g., tests pass) are met. |
| **`SessionStart`** | Session startup or restart | Inject dynamic context or restore state after compaction (`compact` matcher). |
| **`InstructionsLoaded`** | When rules or `CLAUDE.md` load | Audit which context and instructions entered the session. |
| **`PreCompact` / `PostCompact`**| Before and after conversation compaction | Clean up state or log compaction boundaries. |

## 2. PreToolUse JSON Control
Return JSON with exit code `0` to control execution via `permissionDecision`:
* **`allow`:** Permits the tool call.
* **`deny`:** Halts execution and returns `permissionDecisionReason` to Claude.
* **`ask`:** Prompts the user for interactive confirmation.
* **`defer`:** Pauses the tool during non-interactive (`-p`) runs.

### Input Rewriting (`updatedInput`)
* **Redact Instead of Blocking:** Intercept commands containing sensitive patterns (e.g., API keys like `sk_live_`) and substitute placeholders.
* **Full Replacement:** `updatedInput` overwrites the entire input object—always echo unchanged fields back.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Direct push to main branch is disallowed.",
    "updatedInput": {
      "command": "git checkout -b feature-branch"
    }
  }
}