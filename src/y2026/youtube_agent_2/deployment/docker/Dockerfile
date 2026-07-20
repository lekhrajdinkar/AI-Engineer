FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

COPY src/y2026/youtube_agent_2/backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY src /app/src

EXPOSE 8001

CMD ["uvicorn", "src.y2026.youtube_agent_2.backend.services.gateway.main:app", "--host", "0.0.0.0", "--port", "8001"]
