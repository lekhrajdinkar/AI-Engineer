FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app
WORKDIR /app

COPY src/y2026/youtube_agent_2/backend/services/plans/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY src/__init__.py /app/src/__init__.py
COPY src/y2026/__init__.py /app/src/y2026/__init__.py
COPY src/y2026/youtube_agent_2/__init__.py /app/src/y2026/youtube_agent_2/__init__.py
COPY src/y2026/youtube_agent_2/backend/__init__.py /app/src/y2026/youtube_agent_2/backend/__init__.py
COPY src/y2026/youtube_agent_2/docs/json-dumps /app/src/y2026/youtube_agent_2/docs/json-dumps
COPY src/y2026/youtube_agent_2/backend/shared /app/src/y2026/youtube_agent_2/backend/shared
COPY src/y2026/youtube_agent_2/backend/services/__init__.py /app/src/y2026/youtube_agent_2/backend/services/__init__.py
COPY src/y2026/youtube_agent_2/backend/services/plans /app/src/y2026/youtube_agent_2/backend/services/plans

EXPOSE 8003
CMD ["uvicorn", "src.y2026.youtube_agent_2.backend.services.plans.app.main:app", "--host", "0.0.0.0", "--port", "8003"]
