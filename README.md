# AI Engineering

## Capacitor iOS application

The native project under `ios/` packages the YouTube Learning React application
from `src/y2026/youtube_agent_2/frontend`. The mobile build calls the deployed
Render gateway at `https://youtube-learning-gateway.onrender.com`; the gateway
routes requests to the YouTube and Plans services.

```bash
npm ci                  # Capacitor/native dependencies
npm run frontend:install
npm run dev             # YouTube Learning browser development
npm run ios:sync        # Mobile web build + native plugin sync
npm run ios:open        # Open the Xcode workspace (macOS)
```

Follow [`ios/README.md`](ios/README.md) for signing and installation. Native
Google sign-in additionally requires `GoogleService-Info.plist` from the
existing Firebase project.

## Docs by year
- [2025](docs/2025/README.md)
- [2026](docs/2026/README.md)

---
## Generating mkdocs.yml
> Files ending with `__x.md` will be skipped
```bash
pip install -r requirements-netlify.txt
python scripts/generate_mkdocs.py
# .\scripts\generate_mkdocs.bat
mkdocs serve
```
---
## coding agent

| Tool                       |                         Price | Best For                                             |
| -------------------------- | ----------------------------: | ---------------------------------------------------- |
| **Claude Code**            |    Free (limited) / ~$20–$100 | Excellent for large codebases and terminal workflows |
| **Gemini CLI**             |                      **Free** | Great free terminal coding agent                     |
| **OpenAI Codex (ChatGPT)** |       Free limited / Plus $20 | Full-stack development, debugging, architecture      |
| **GitHub Copilot**         |                     $10/month | IDE autocomplete and chat                            |
| **Continue.dev**           |                      **Free** | VS Code extension using your own LLM                 |
| **Cline**                  | Free (pay only for API usage) | Powerful autonomous coding in VS Code                |
| **Aider**                  |      **Free** (API cost only) | Git-based coding agent from the terminal             |
