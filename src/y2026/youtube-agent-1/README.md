Usage (PowerShell)

```powershell
$env:YOUTUBE_API_KEY = ""
python .\src\y2026\youtube-agent\get_kodekloud_videos.py --query KodeKloud --max-results 50
python .\src\y2026\youtube-agent\get_kodekloud_videos.py --channel-id UCSWj8mqQCcrcBlXPi4ThRDQ --max-results 100
```

Output
- JSON is written to `src/y2026/youtube-agent/metadata/kodekloud_videos.json`



