# Routines and Headless in Claude Code

> - https://www.youtube.com/watch?v=b9TCW-pdzDA
> - https://www.youtube.com/watch?v=dRsjO-88nBs
> - https://anthropic.skilljar.com/claude-code-in-action/486935

## Core Concept
* **Automation Spectrum:** Shift recurring tasks away from manual terminal execution.
    * **Routines:** Fully managed on Anthropic infrastructure (zero hosting/maintenance).
    * **Headless Mode & Agent SDK:** Run locally or inside custom infrastructure/code for fine-grained execution control.

---

## 1. Routines (Managed Cloud Execution)
* **Components:** Bundles a **Prompt**, **Target Repository**, **Connectors**, and a **Trigger**.
* **Supported Triggers:**
    * **Cron Schedule:** Recurring time-based intervals (e.g., daily at 9:00 AM).
    * **HTTP POST:** Webhook triggers via API endpoints from external tools.
    * **GitHub Events:** Event-driven actions (e.g., triage on new PR submission).
* **Creation Methods:**
    * **Web UI:** Configure directly at `claude.ai/code/routines`.
    * **Terminal CLI:** Run `/schedule <description>` (e.g., `/schedule daily dependency audit at 9am`).
* **Key Constraints:**
    * Recurring schedules run **at most once per hour**.
    * Executes in a fresh clone of the default branch.
    * Restricted to pushing to `claude/*` branches by default to protect primary branches.

---

## 2. Headless Mode (Local & Scripted Pipelines)
* **One-Shot Execution:** Use `claude -p "<prompt>"` (`--print`) to read from `stdin` and write to `stdout` without an interactive UI.
* **Fast Startup:** Bypasses auto-discovery of `CLAUDE.md`, hooks, skills, MCP servers, and plugins, loading only explicitly specified tools.

### Structured JSON Output
Enforce structured schemas and extract clean outputs using `jq`:
```bash
claude -p "Extract the exported function names from src/core/style.js" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}' \
  | jq '.structured_output.functions'
```

### Multi-Step Workflows & Resuming Sessions
Pass state across separate pipeline stages using the session identifier:
```bash
claude --resume "$(jq -r .session_id /tmp/plan.json)"
```

## 3. The Agent SDK (Embedded in Applications)
- Library Integration: Embed Claude Code engine directly into TypeScript or Python codebases.
- SDK Capabilities: Exposes a programmatic query function allowing configuration of allowedTools, system prompts, permission modes, and streamed responses.

## Summary
| Tool                         | Best Use Case                                           | Execution Environment          |
| ---------------------------- | ------------------------------------------------------- | ------------------------------ |
| **Routines**                 | Recurring scheduled scans, PR triage, background audits | Anthropic-managed cloud        |
| **Headless (`-p`)**          | Shell scripts, CLI data piping, local automation        | Custom server / local terminal |
| **Deterministic (`--bare`)** | Predictable, repeatable automated testing               | CI/CD build runners            |
| **Agent SDK**                | Custom software products, user-facing AI applications   | TypeScript / Python runtimes   |
