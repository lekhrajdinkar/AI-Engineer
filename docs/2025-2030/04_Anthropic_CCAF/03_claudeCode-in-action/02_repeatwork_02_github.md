# GitHub Actions and Code Review

> - [Anthropic Academy: GitHub Actions and Code Review](https://anthropic.skilljar.com/claude-code-in-action/486936)
> - https://www.youtube.com/watch?v=gIVt_iqmACw

## Core Concept
* **Automation at the Pull Request:** Hand off repetitive review and CI tasks directly where code changes land.
    * **Code Review (Managed Path):** Anthropic-hosted service that leaves inline findings without requiring hosting or setup.
    * **GitHub Action (DIY Path):** Customizable action (`anthropics/claude-code-action@v1`) for implementing features, fixing bugs from comments, or running scheduled CI tasks.

---

## 1. Managed Path: Code Review
* **Setup:** Organization admin enables it in Claude Code admin settings and installs the Claude GitHub app.
* **Trigger Options:**
    * Once when a PR opens
    * On every push to the PR
    * Only when someone comments `@claude review`
* **Analysis:** Reviews the diff against the full codebase (not just isolated lines). Deduplicates and ranks findings by severity with inline comments and a summary table.
* **Boundaries:**
    * **No auto-approve/block:** Judgments remain human-controlled.
    * **No remote autofix:** Apply findings locally via `/code-review --fix` in your local terminal.

---

## 2. DIY Path: GitHub Action
* **Setup:** Run `/install-github-app` inside Claude Code (requires repo admin) to install the app and configure the repository secret.
* **Action:** `anthropics/claude-code-action@v1`

### Key Action Inputs
* `anthropic_api_key`: API key secret (optional if using Bedrock/Vertex).
* `github_token`: Defaults to `secrets.GITHUB_TOKEN`.
* `trigger_phrase`: Comment trigger (defaults to `@claude`).
* `use_bedrock` / `use_vertex`: Cloud provider toggles.
* `prompt`: High-level instructions for the agent run.
* `claude_args`: CLI flags passed directly into Claude Code.

---

## 3. Example Workflows

### Comment-Driven Implementation (`.github/workflows/claude.yaml`)
```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    trigger_phrase: "@claude"
    prompt: "Your instructions here"
    claude_args: "--max-turns 5 --model claude-sonnet-5"
```