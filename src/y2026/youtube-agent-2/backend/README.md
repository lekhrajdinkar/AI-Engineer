# Backend 
## One time configuration

### update environment variables 
```.dotenv
.env file
---
# YOUTUBE_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8001/auth/google/callback
```

### Setup  Google Oauth Client
- https://console.cloud.google.com/
- Create or select a Project
- Navigation menu → APIs & Services → Library.
- Search for “YouTube Data API v3” → Enable.
- APIs & Services → OAuth consent screen.
- Choose “Internal” (G Suite only) or “External” (most apps use External).
- Create OAuth 2.0 Client ID
    - APIs & Services → Credentials → + Create Credentials → OAuth client ID.
    - Application type: choose “Web application”.
    - Name: e.g., “youtube-learning-ui”.
    - Authorized JavaScript origins: (if needed) e.g., http://localhost:5173
    - Authorized redirect URIs:  http://localhost:8001/auth/google/callback

---
## Run
```bash
python -m venv .venv; .\.venv\Scripts\Activate.ps1; 
pip install -r requirements.txt

# Push-Location src\y2026\youtube-agent-2\backend
uvicorn src.y2026.youtube-agent-2.backend.main:app --reload --port 8001
# Pop-Location
```
Endpoints 
- http://127.0.0.1:8001/docs 
- http://localhost:8001/auth/google/login
- http://127.0.0.1:8001/api/channels



