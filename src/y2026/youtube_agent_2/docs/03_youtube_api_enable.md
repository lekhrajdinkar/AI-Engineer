# GCP - YouTube API
- https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=agents-2026-502600
- Enable API | https://developers.google.com/youtube/v3/docs/?apix=true
- Set up credential

![google-console.png](img/google-console.png)


## Steps
- Navigation menu → APIs & Services → Library.
- Search for “YouTube Data API v3” → Enable.
- APIs & Services → OAuth consent screen.
- Choose “Internal” (G Suite only) or “External” (most apps use External).
- Create OAuth 2.0 Client ID
    - APIs & Services → Credentials → + Create Credentials → OAuth client ID.
    - Application type: choose “Web application”.
    - Name: e.g., “youtube-learning-ui”.
    - Authorized JavaScript origins: (if needed) e.g., http://localhost:5173 , UI URL
    - Authorized redirect URIs:  http://localhost:8001/auth/google/callback , backend api URL
