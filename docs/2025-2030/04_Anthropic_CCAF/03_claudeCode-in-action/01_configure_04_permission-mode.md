# Permission Modes in Claude Code
> - https://www.youtube.com/watch?v=Fjg4O-ZcRSU
> - https://anthropic.skilljar.com/claude-code-in-action/486932
## Core Concept
* **Pre-Approved Execution:** Permission modes set trust boundaries once so Claude can run tasks without repeatedly prompting for manual sign-off on every action.
* **Shortcut:** Press `Shift-Tab` to cycle through everyday modes (`manual`, `accept edits`, `plan`, and `auto`). The current mode displays in the bottom status bar.

## 1. The Six Permission Modes

| Mode | Behavior | Ideal Use Case |
| :--- | :--- | :--- |
| **Manual** | Reads only without asking; prompts for everything else. | Maximum hands-on control and granular oversight. |
| **Accept edits** | Runs file reads, edits, and common bash file operations automatically. | Rapid code iteration reviewed after execution. |
| **Plan** | Read-only mode; researches codebase and designs proposals without editing. | Scoping and architectural planning. |
| **Auto** | Hands-off execution guarded by a secondary classifier model. | Unattended everyday work and autonomous tasks. |
| **Don't ask** | Allows only pre-approved tools; auto-denies anything else without prompting. | CI/CD pipelines, scheduled jobs, and unattended batches. |
| **Bypass permissions** | Disables all checks (`--dangerously-skip-permissions`). | Isolated sandboxes, disposable containers, and VMs only. |

## 2. How Auto Mode Works
* **Classifier Guards Intent:** A dedicated secondary classifier evaluates each action in real time to prevent destructive escalations (e.g., prod deploys, migrations, force pushes, sensitive data exfiltration).
* **Permitted Operations:** Allows normal local changes, project lockfile dependency installations, read operations, and pushes to your active branch.

## 3. Auto Mode + Stop Hooks Pairing
* **Classifier (Intent Guard):** Evaluates whether an action is safe *before* it runs (does not evaluate code correctness).
* **Stop Hook (Correctness Guard):** Executes automated test suites *after* Claude finishes work to verify that the code functions correctly.