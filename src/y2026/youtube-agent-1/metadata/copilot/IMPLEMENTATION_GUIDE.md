# YouTube Agent Implementation Guide

This guide provides technical instructions for implementing the TechVault YouTube Agent based on the system prompt.

## Architecture Overview

```
┌─────────────────┐
│  YouTube API    │  (Discovery & Metadata)
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────────┐
│   Content Discovery & Filtering Module       │
│  - Monitor channels                          │
│  - Detect new content                        │
│  - Assign relevance scores (0.0-1.0)        │
└─────────┬───────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────┐
│   Categorization & Tagging Module            │
│  - LLM-based classification                  │
│  - Multi-category assignment                │
│  - Difficulty level detection               │
└─────────┬───────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────┐
│   Metadata Extraction & Enrichment           │
│  - Validate against schema                   │
│  - Extract embeddings for semantic search   │
│  - Generate summaries                       │
└─────────┬───────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────┐
│   Vector Database (ChromaDB)                │
│  - Store embeddings                          │
│  - Enable semantic search                    │
│  - Deduplication via similarity             │
└─────────┬───────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────┐
│   React Dashboard Frontend                   │
│  - Search interface (full-text + semantic)  │
│  - Category browsing                        │
│  - Learning paths & recommendations         │
│  - Progress tracking                        │
└─────────────────────────────────────────────┘
```

## Tech Stack

- **Language**: Python 3.13+ (using `uv` for dependency management)
- **LLM Integration**: OpenAI-compatible API (ChatOpenAI)
- **Agent Framework**: LangGraph (StateGraph for orchestration)
- **Vector DB**: ChromaDB (local persistent storage)
- **Embeddings**: sentence-transformers `all-MiniLM-L6-v2`
- **Data Validation**: Pydantic (JSON schema validation)
- **YouTube Data**: YouTube Data API v3
- **Frontend**: React (separate repo or integrated)
- **Storage**: JSON files or SQLite for metadata catalog

## Implementation Steps

### Phase 1: Foundation (Week 1)
1. Set up project structure with uv
2. Implement Pydantic models for video metadata
3. Create ChromaDB collection for embeddings
4. Write metadata extraction utilities

### Phase 2: Agent Core (Week 2)
1. Create LangGraph StateGraph for agent orchestration
2. Implement discovery module (YouTube API polling)
3. Implement categorization module (LLM-based classification)
4. Implement relevance scoring logic

### Phase 3: Search & Indexing (Week 3)
1. Set up semantic search (embeddings + ChromaDB)
2. Implement full-text search
3. Add deduplication logic
4. Create search result ranking algorithm

### Phase 4: Learning Paths (Week 4)
1. Build dependency graph between topics
2. Implement learning path recommendation engine
3. Add gap detection logic
4. Create path serialization for frontend

### Phase 5: Frontend & Integration (Week 5)
1. Design React dashboard
2. Integrate search endpoints
3. Add user progress tracking
4. Deploy with backend API

## Key Files to Create

```
src/y2026/youtube-agent/
├── agent/
│   ├── __init__.py
│   ├── state.py                    # Pydantic models & StateGraph definition
│   ├── discovery.py                # YouTube monitoring & content detection
│   ├── categorization.py           # LLM-based classification
│   ├── metadata_extraction.py      # Parsing & validation
│   ├── relevance_scorer.py         # Scoring algorithm
│   └── orchestrator.py             # Main LangGraph workflow
├── search/
│   ├── __init__.py
│   ├── semantic_search.py          # ChromaDB + embeddings
│   ├── full_text_search.py         # Full-text indexing
│   ├── deduplication.py            # Duplicate detection
│   └── ranking.py                  # Result ranking
├── learning_paths/
│   ├── __init__.py
│   ├── graph_builder.py            # Topic dependency graph
│   ├── path_engine.py              # Path recommendation
│   ├── gap_detector.py             # Knowledge gap analysis
│   └── serializer.py               # Path JSON export
├── database/
│   ├── __init__.py
│   ├── chroma_client.py            # ChromaDB wrapper
│   └── catalog.py                  # Metadata catalog
├── api/
│   ├── __init__.py
│   ├── routes.py                   # FastAPI endpoints
│   └── middleware.py               # Caching, CORS, etc.
└── main.py                         # Agent entry point
```

## Core Workflows

### Discovery Workflow
```python
# Pseudo-code
channels = load_configured_channels()
for channel in channels:
    new_videos = get_new_videos_since_last_check(channel)
    for video in new_videos:
        metadata = extract_basic_metadata(video)
        is_technical = classify_as_technical(metadata.description)
        if is_technical:
            queue_for_processing(video, metadata)
```

### Categorization Workflow
```python
# Use LangGraph agent with function calling
# Agent tool: categorize_video(video_metadata) -> categories
# Uses the system prompt to guide classification
# Output: JSON with primary_category, subcategories, topics
```

### Search Workflow
```python
# Semantic Search
embeddings = embed(query)
results = chroma_collection.query(embeddings, top_k=10)

# Full-Text Search
results = full_text_index.search(query, boost_recent=True)

# Hybrid: Combine & rerank
combined = merge_results(semantic, full_text)
ranked = rerank(combined, user_history)
```

## Configuration (`.env`)

```bash
# YouTube API
YOUTUBE_API_KEY=your_api_key
YOUTUBE_CHANNEL_IDS=UCxxx,UCyyy,UCzzz

# OpenAI-compatible
OPENAI_API_KEY=your_key
OPENAI_API_BASE=http://your_gateway:8000/v1
OPENAI_MODEL=openai/gpt-4.1-mini

# ChromaDB
CHROMA_DB_PATH=./chroma_db
CHROMA_COLLECTION_NAME=techcorp_rag

# Agent settings
RELEVANCE_THRESHOLD=0.6
BATCH_SIZE=10
DISCOVERY_INTERVAL_HOURS=24
```

## Validation & Testing

### Unit Tests
- Metadata extraction accuracy
- Categorization correctness
- Search ranking quality
- Learning path validity

### Integration Tests
- End-to-end discovery pipeline
- API endpoint functionality
- Database operations

### Evaluation Metrics
- Categorization F1 score (vs. manual ground truth)
- Search relevance (NDCG, MAP)
- Deduplication precision/recall
- Learning path coverage (topics recommended vs. available)

## Deployment

### Local Development
```bash
uv sync
uv run python -m src.y2026.youtube_agent.main
```

### Docker
```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY pyproject.toml uv.lock .
RUN pip install uv && uv sync
COPY src/ src/
CMD ["uv", "run", "python", "-m", "src.y2026.youtube_agent.api.routes"]
```

### Cloud Deployment
- Deploy backend to Cloud Run / Lambda
- Deploy React frontend to Vercel / Netlify
- ChromaDB: Use managed service or persist to Cloud Storage
- YouTube API: Use service account with YouTube Data API enabled

## Next Steps

1. **Code Review**: Review system prompt with team for blind spots
2. **PoC**: Build minimum viable discovery + 1 category as proof-of-concept
3. **Iteration**: Refine categorization accuracy based on manual validation
4. **Dashboard**: Once search works, build React frontend
5. **Scale**: Add more channels, monitor cost, optimize performance

