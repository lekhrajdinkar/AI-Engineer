# API example requests — Backend prototype

Assumes backend is running locally on http://localhost:8001

1) List demo channels

curl (PowerShell):

```powershell
curl http://localhost:8001/api/channels
```

HTTPie:

```powershell
http GET :8001/api/channels
```

2) Create a learning plan (import channels)

```powershell
http POST :8001/api/plans name="My AI Learning" description="Demo" channel_ids:='["UC_x5XG1OV2P6uZZ5FSM9Ttw"]'
```

3) Get plan details

```powershell
http GET :8001/api/plans/<PLAN_ID>
```

4) Refresh plan (incremental sync demo)

```powershell
http PATCH :8001/api/plans/<PLAN_ID>/refresh
```

5) Ask AI agent (suggest grouping) — demo stub

```powershell
http POST :8001/api/plans/<PLAN_ID>/ai-suggest
```

6) Search for videos across plans

```powershell
http GET :8001/api/search q=="keyword"
```

Notes:
- Replace <PLAN_ID> with the ID returned from the create plan call.
- These are example HTTPie commands; `curl` equivalents are straightforward.

