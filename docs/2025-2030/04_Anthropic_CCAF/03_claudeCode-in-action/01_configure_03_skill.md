# Verification Skills in Claude Code
> - https://www.youtube.com/watch?v=soLPOXXAc1w
> - https://anthropic.skilljar.com/claude-code-in-action/486930

## Core Concept
* **Automated Self-Checking:** Replaces manual post-task checks by having Claude automatically run verification procedures whenever matching work completes.
* **Rule of Thumb:** If you have typed the same multi-step instruction twice (e.g., test runs, release checklists, migration recipes), convert it into a skill.

## 1. How Verification Skills Work
* **Trigger:** The skill activates automatically based on its `description` matching the task completed (e.g., refactoring).
* **Automated Flow:**
    * Runs the test suite.
    * Reads the code diff.
    * Verifies tests were not weakened or bypassed just to make them pass.
    * Reports explicit pass/fail results with attached evidence.
* **Definition of "Done":** "Done" means gates are actively run and observed—not just assuming the code looks right from reading a diff.

## 2. Skill Folder Structure
Keep `skill.md` lean and delegate heavy material to side files in the folder:
* **`skill.md`:** Main file containing the name, triggering description, and core procedure.
* **`reference.md`:** Contains deep explanations/docs; Claude only reads it on demand to save context.
* **Executable Scripts (e.g., `check.sh`):** Claude executes scripts directly rather than reading entire script contents into context.
* **Token Efficiency:** Only skill descriptions are loaded into context upfront; the full skill loads only when triggered.

## 3. Instruction Surfaces: Where Rules Belong

| Surface | Purpose | Example |
| :--- | :--- | :--- |
| **`CLAUDE.md`** | Conventions that apply all the time | Naming conventions, file structure, global style |
| **Skills** | Procedures and references tied to specific tasks | Verification workflows, deployment steps, migrations |
| **Hooks** | Hard enforcement that Claude cannot bypass | Blocking direct pushes to `main`, pre-commit guardrails |

## 4. Implementation
* **Location:** Check custom skills into `.claude/skills` in your project repository so the whole team inherits automated verification.