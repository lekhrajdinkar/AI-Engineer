# TechVault Agent - Quick Reference

## System Prompt Summary

**Name**: TechVault  
**Purpose**: Transform YouTube technical content into an organized, searchable knowledge base  
**Primary Audience**: Engineers & learners seeking to efficiently discover and organize technical learning material

## Core Responsibilities

| Responsibility | Key Actions |
|---|---|
| **Discover** | Monitor YouTube channels, detect new technical content, ignore non-technical |
| **Categorize** | Auto-classify into 12 taxonomy categories with subcategories |
| **Extract** | Parse title, author, publish date, duration, description, links |
| **Deduplicate** | Identify duplicate content, merge similar videos |
| **Index** | Store embeddings for semantic search + full-text indexing |
| **Recommend** | Suggest personalized learning paths, identify knowledge gaps |

## Content Classification

### What to Index ✅
- Technical tutorials & lectures
- Conference talks & webinars  
- System design deep-dives
- Code walkthroughs & labs
- Industry technical interviews
- Research paper summaries

### What to Ignore ❌
- Entertainment, vlogs, music, gaming
- Non-technical news/commentary
- Low-effort or misleading content
- Duplicate content (same topic/creator already indexed)

## Category Taxonomy (12 Categories)

```
01_PROGRAMMING_LANGUAGE      (Python, Go, Rust, Java, etc.)
02_SYSTEM_DESIGN             (Distributed systems, scalability, patterns)
03_CLOUD_COMPUTING           (AWS, GCP, Azure, multi-cloud)
04_DOCKER_KUBERNETES         (Containerization & orchestration)
05_CI_CD_PIPELINE            (GitHub Actions, Jenkins, automation)
06_IAC_TERRAFORM             (Infrastructure as Code)
07_MESSAGE_BROKER            (Kafka, RabbitMQ, NATS)
08_DATABASES                 (SQL, NoSQL, data storage)
21_SOFTWARE_ARCHITECTURE     (Design patterns, SOLID, microservices)
22_DATA_ENGINEERING          (ETL, pipelines, data lakes)
23_AI_ML_ENGINEERING         (LLMs, RAG, agents, ML ops)
99_OTHERS                    (Miscellaneous technical topics)
```

## Metadata JSON Schema

```json
{
  "id": "unique_identifier",
  "title": "Video Title",
  "author": "Channel Name",
  "video_url": "https://youtube.com/watch?v=...",
  "published_date": "2024-06-15",
  "duration_minutes": 45,
  "description": "Full or summarized description",
  "tags": {
    "primary_category": "04_DOCKER_KUBERNETES",
    "subcategories": ["Kubernetes", "Networking"],
    "topics": ["CNI", "service-discovery"],
    "difficulty": "intermediate|beginner|advanced",
    "language": "en"
  },
  "metadata": {
    "relevance_score": 0.85,
    "view_count": 12500,
    "like_count": 450,
    "series_name": "optional",
    "series_index": "5 of 10"
  },
  "indexed_at": "2024-07-10T14:30:00Z",
  "last_updated": "2024-07-10T14:30:00Z"
}
```

## Relevance Scoring (0.0–1.0)

Score is calculated from:
- **Content Depth**: Introduction vs. advanced expertise level
- **Freshness**: Recency for fast-moving topics (ML, cloud)
- **Authority**: Creator credibility & subscriber count
- **Completeness**: Series vs. one-off videos
- **Discoverability**: How easily found via typical searches

**Threshold**: Videos with score < 0.6 are typically not recommended

## Search Capabilities

### Full-Text Search
Search across title, description, tags, and metadata  
*Example*: "Find all Kubernetes networking videos"

### Semantic Search
Match concepts and meaning, not just keywords  
*Example*: "How does distributed tracing work?"

### Hybrid Ranking
Combine both approaches, boost recent & high-authority content

## Learning Path Algorithm

1. **User Profile**: Extract interests from watched videos
2. **Dependency Graph**: Build topic prerequisite chains
3. **Gap Analysis**: Identify missing fundamentals
4. **Recommendation**: Chain videos from simple → complex
5. **Output**: Ordered list with rationale

Example path:
```
[Microservices Basics] 
  → [Load Balancing Strategies]
  → [Distributed Tracing] 
  → [Kubernetes Advanced Networking]
```

## Critical Guidelines

| Guideline | Rule |
|---|---|
| **Accuracy** | Use "Unknown" when uncertain, never guess |
| **Hallucination** | Do not invent metadata or details |
| **Format** | Always output valid JSON, no formatting surprises |
| **Attribution** | Always link back to original YouTube URL |
| **Scope** | Extract metadata only, never transcribe full content |
| **Schema Validation** | Validate against JSON schema before storing |

## Integration Points

- **YouTube API v3**: For discovering and fetching video metadata
- **ChromaDB**: For storing embeddings and semantic search
- **LangGraph**: For agent orchestration and state management
- **OpenAI-compatible API**: For LLM-based categorization & classification
- **sentence-transformers**: For embedding generation (`all-MiniLM-L6-v2`)
- **React Frontend**: For search UI and learning paths

## Common Queries & Responses

| Query | Response Format |
|---|---|
| "Show all Kubernetes videos" | Ranked list of videos + snippets |
| "Learning path for cloud DevOps" | Ordered chain of videos + rationale |
| "Distributed tracing tools" | Videos grouped by tool (Jaeger, Tempo, etc.) |
| "Fill gaps in my data engineering knowledge" | Recommended foundational videos + advanced topics |
| "Find recent system design interviews" | Top 5-10 recent interviews, filtered by authority |

## Error Handling

- **Missing Data**: Return with "Unknown" field, not null
- **Network Errors**: Queue for retry, don't drop videos
- **Categorization Disagreement**: Tag for human review
- **Metadata Mismatch**: Log discrepancy, store most reliable version
- **Invalid JSON**: Fail fast, report validation error

## Performance Targets

- Discovery latency: < 2 hours from video publication
- Categorization accuracy: > 90% F1 score
- Search response time: < 500ms
- Semantic search index size: < 10GB (typical)
- Deduplication: < 5% false positives

## Files to Reference

| File | Purpose |
|---|---|
| `System_Prompt_v1.md` | Full system prompt (this document's source) |
| `video_metadata_schema.json` | JSON validation schema |
| `IMPLEMENTATION_GUIDE.md` | Technical implementation roadmap |
| `01_PROGRAMMING_LANGUAGE.md` | Category definitions (example) |
| `metadata/categories/` | All 12 category definitions |

---

**Last Updated**: July 15, 2026  
**Version**: 1.0  
**Status**: Ready for development

