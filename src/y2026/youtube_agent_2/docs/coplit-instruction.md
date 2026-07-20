# instruction (short)

- Save my copilot model usage billing. hence use less token.
- Root folder for this project: `src/y2026/youtube-agent-2` — do not edit files outside this folder.
  - Backend: `src/y2026/youtube-agent-2/backend`
  - Frontend: `src/y2026/youtube-agent-2/frontend`
  - Project requirements: `src/y2026/youtube-agent-2/metadata/project-req-doc.md`

- Documentation rules (must follow):
  1. Keep docs short and focused.
  2. Use only these canonical files for documentation:
     - `src/y2026/youtube-agent-2/backend/README.md` (backend docs, tokens, run steps)
     - `src/y2026/youtube-agent-2/frontend/README.md` (frontend run/development notes)
  3. Do NOT create duplicate or overlapping documentation files. Add minimal, necessary notes only.

- Tokens / telemetry:
  - Save OAuth tokens and model input/output traces only in the backend store: `backend/youtubeldb.sqlite3` (table `tokens`) or a clearly documented secure location.
  - Avoid committing secrets to git. Use `.env` for local credentials and list it in `.gitignore`.

- Purpose: this file is a short policy reference for contributors and automation. Keep it minimal.
