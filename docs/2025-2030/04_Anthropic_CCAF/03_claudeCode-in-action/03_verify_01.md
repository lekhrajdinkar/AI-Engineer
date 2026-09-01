# Trust It: Verifying Unsupervised Runs

> - [How to Trust a Claude Code Run You Did Not Watch](https://www.youtube.com/watch?v=lalGZSNhm8E) 
> - [Anthropic Academy: Verifying Unsupervised Runs](https://anthropic.skilljar.com/claude-code-in-action/486938)

## Core Concept
* **Proportional Verification:** Verify in direct proportion to how unsupervised the run was—the less you watched, the more thoroughly you must verify.
* **Auto Mode Safety:** Keep unattended runs in `auto` mode rather than bypassing permissions. The secondary classifier acts as a safety net against destructive actions, though it does not evaluate whether code logic is correct.

---

## 1. Inspect the Diff, Not the Summary
* **The Summary Trap:** Claude's generated summary can read cleanly while the underlying code touches unexpected files or introduces regressions.
* **Review Steps:**
    1. Run `/code-review` to inspect automated findings and flagged issues.
    2. Directly inspect `git diff` with your own eyes, checking planned files first, then verifying no unintended files were modified.

---

## 2. Tests as Gates (Stop Hooks)
* **Deterministic Verification:** Do not rely on Claude's self-reported claims that tests passed—enforce execution programmatically with hooks.
* **Key Hooks:**
    * **Stop Hook:** Runs test suites when Claude attempts to complete a turn; blocks completion on test failures.
    * **PostToolUse Hook:** Automatically runs linters and type checkers after every file edit.
* **Self-Healing via Exit Code `2`:** Exiting a hook script with `exit 2` returns the failure output directly to Claude's context, causing Claude to self-correct and fix the issue without human intervention.

---

## 3. Fresh Eyes: Cold Second Opinion
* **Sub-Agent Review:** Launch a clean session or sub-agent with no memory of earlier context or implementation decisions.
* **Objective Evaluation:** A fresh reviewer has no bias toward the chosen approach and easily catches edge cases or rationalizations made during the initial run.

---

## 4. Unsupervised Verification Checklist
* Inspect `git diff` manually rather than relying on written summaries.
* Enforce automated test and lint execution via blocking hooks (`exit 2`).
* Validate headless runs through explicit structured JSON outputs and process exit codes.
* Spin up an isolated sub-agent for an unbiased second-opinion code review.