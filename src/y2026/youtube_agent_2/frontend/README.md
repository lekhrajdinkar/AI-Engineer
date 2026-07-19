# Frontend
## Links
- [project-requirement-doc.md](../metadata/project-req-doc.md)
- [backend README.md](../backend/README.md)

## Includes
- Learning plans, courses, workspace playback, labels, search, sort, and theme controls.
- Channel/playlist course creation with source cards and video review.
- Source sync and staged course-refresh feeds with visual/JSON review before submission.

## Run ⭐
> Dependencies are installed at the repo root (`../../..`). No separate `npm install` needed here.

```bash
# Start backend
.\.venv\Scripts\activate
uvicorn src.y2026.youtube_agent_2.backend.main:app --reload --port 8001

# Start Vite
cd src\y2026\youtube_agent_2\frontend;
npm run dev
```
