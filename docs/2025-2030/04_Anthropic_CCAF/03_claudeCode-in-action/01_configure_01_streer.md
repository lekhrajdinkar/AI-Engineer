# Steering Claude Code Through Long Sessions
> - https://www.youtube.com/watch?v=l_4ZYAiyP7U
> - https://anthropic.skilljar.com/claude-code-in-action/486901

## 1. Scope First (Plan Mode)
* **Plan Mode:** Claude conducts read-only research across files and creates a plan before modifying code.
* **Review:** Inspect and refine the plan early to prevent costly cleanup later.

## 2. Steer in Real-Time
* **`/compact [instructions]`:**
    * Summarizes the chat, clears old messages, and preserves the context window.
    * Always include directional instructions (e.g., `/compact Focus on the --version flag implementation`) to retain critical details.
* **Rewind Menu:**
    * **Trigger:** Double-tap `Esc` on an empty prompt to access checkpoints created after each prompt.
    * **Options:**
        * *Restore code and conversation* (full rollback)
        * *Restore conversation* / *Restore code* (isolated rollback)
        * *Summarize from here* (compresses subsequent messages)
        * *Summarize up to here* (compresses setup/earlier context)

## 3. Autonomous Execution
* **`/goal [condition]`:**
    * Runs across multiple turns until a fast evaluator verifies the criteria from transcript output (e.g., `/goal all tests pass`).
    * Cancel via `/goal clear`.
* **`/loop`:**
    * Runs a prompt at intervals to poll external states (e.g., CI/CD builds, deployments).
    * Stop by pressing `Esc`.

## 4. Parallel Work with Worktrees
* **Isolation:** Use Git worktrees so multiple Claude agents work on separate file trees without file collisions.
* **Cleanup:** Clean worktrees are removed automatically on session exit.
* **`.worktreeinclude`:** Place at the repo root to copy untracked/git-ignored files (e.g., `.env`, local configs) into each worktree.

---

## Summary
- **Scope** your work first, then steer.
- Direct your **compaction** so the summary keeps what matters.
- Use the **rewind** menu to course correct when Claude drifts.
- Set a **goal** when you can describe "done" better than you can describe the steps.
- Run parallel work in **worktrees**.