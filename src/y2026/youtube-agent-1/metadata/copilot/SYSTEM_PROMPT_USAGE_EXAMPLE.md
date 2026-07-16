# System Prompt Usage Example

This file demonstrates how to use the TechVault system prompt with LangGraph & LangChain.

## Basic Setup

```python
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph
from pydantic import BaseModel
from typing import Annotated
import operator

# Load the system prompt
SYSTEM_PROMPT = open("../prompts/System_Prompt_v1.md").read()

# Initialize LLM
llm = ChatOpenAI(
    model="openai/gpt-4.1-mini",
    temperature=0.1,  # Low temperature for categorization accuracy
    api_key=os.getenv("OPENAI_API_KEY"),
    api_base=os.getenv("OPENAI_API_BASE"),
)

# Bind system prompt to LLM
agent_llm = llm.bind_tools(
    tools=[categorize_video, extract_metadata, score_relevance],
    system=SYSTEM_PROMPT,
    tool_choice="auto"
)
```

## Example 1: Categorization Agent

```python
from langchain_core.messages import HumanMessage, SystemMessage

# Input video data
video_input = {
    "title": "Kafka Consumer Groups Explained",
    "description": "Deep dive into how Kafka consumer groups work, including offset management, rebalancing, and best practices.",
    "url": "https://youtube.com/watch?v=abc123"
}

# Create categorization message
message = HumanMessage(
    content=f"""
Analyze and categorize this video:

Title: {video_input['title']}
Description: {video_input['description']}
URL: {video_input['url']}

Use the categorize_video tool to classify it according to my taxonomy.
"""
)

# Call agent
response = agent_llm.invoke([
    SystemMessage(content=SYSTEM_PROMPT),
    message
])

# Expected output:
"""
{
    "primary_category": "07_MESSAGE_BROKER",
    "subcategories": ["Kafka", "Consumer Groups"],
    "topics": ["offset management", "rebalancing", "group coordination"],
    "difficulty": "intermediate"
}
"""
```

## Example 2: Full Discovery Pipeline with LangGraph

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
import operator

# Define agent state
class VideoState(TypedDict):
    video_id: str
    title: str
    description: str
    url: str
    author: str
    published_date: str
    
    # Enriched during processing
    is_technical: bool
    categories: dict
    metadata: dict
    relevance_score: float
    embeddings: list
    errors: Annotated[list, operator.add]

# Step 1: Validate if content is technical
def validate_technical(state: VideoState) -> VideoState:
    """Use LLM to determine if video is technical content"""
    
    message = HumanMessage(
        content=f"""
Is this YouTube video about technical topics?

Title: {state['title']}
Description: {state['description']}

Answer with YES or NO and briefly explain.
"""
    )
    
    response = agent_llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        message
    ])
    
    is_technical = "YES" in response.content.upper()
    state["is_technical"] = is_technical
    
    return state

# Step 2: Categorize video
def categorize_video_node(state: VideoState) -> VideoState:
    """Categorize video using LLM"""
    
    if not state["is_technical"]:
        state["categories"] = {}
        return state
    
    message = HumanMessage(
        content=f"""
Categorize this technical video:

Title: {state['title']}
Description: {state['description']}

Return ONLY a JSON object with:
- primary_category (from list: 01_PROGRAMMING_LANGUAGE, 02_SYSTEM_DESIGN, ...)
- subcategories (list)
- topics (list)
- difficulty (beginner|intermediate|advanced)
"""
    )
    
    response = agent_llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        message
    ])
    
    # Parse JSON response
    import json
    try:
        state["categories"] = json.loads(response.content)
    except json.JSONDecodeError:
        state["errors"].append(f"Failed to parse categorization: {response.content}")
    
    return state

# Step 3: Calculate relevance score
def score_relevance_node(state: VideoState) -> VideoState:
    """Calculate relevance score"""
    
    message = HumanMessage(
        content=f"""
Rate this video's relevance to technical learning (0.0-1.0):

Title: {state['title']}
Category: {state['categories'].get('primary_category', 'Unknown')}
Description: {state['description'][:200]}...

Consider:
- Content depth & educational value
- Freshness (published {state['published_date']})
- Creator authority (if known)
- Completeness

Return ONLY a number between 0.0 and 1.0.
"""
    )
    
    response = agent_llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        message
    ])
    
    try:
        state["relevance_score"] = float(response.content.strip())
    except ValueError:
        state["errors"].append(f"Failed to parse relevance score: {response.content}")
        state["relevance_score"] = 0.5
    
    return state

# Step 4: Generate embeddings
def embed_video_node(state: VideoState) -> VideoState:
    """Generate embeddings for semantic search"""
    
    from sentence_transformers import SentenceTransformer
    
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    # Combine text for embedding
    text_to_embed = f"{state['title']} {state['description'][:500]}"
    
    embedding = model.encode(text_to_embed)
    state["embeddings"] = embedding.tolist()
    
    return state

# Step 5: Conditional routing
def route_on_technical(state: VideoState) -> str:
    """Route based on whether content is technical"""
    if state["is_technical"]:
        return "categorize"
    else:
        return "skip"

def route_on_score(state: VideoState) -> str:
    """Route based on relevance score"""
    if state["relevance_score"] >= 0.6:
        return "index"
    else:
        return "skip"

# Build graph
graph_builder = StateGraph(VideoState)

# Add nodes
graph_builder.add_node("validate", validate_technical_node)
graph_builder.add_node("categorize", categorize_video_node)
graph_builder.add_node("score", score_relevance_node)
graph_builder.add_node("embed", embed_video_node)
graph_builder.add_node("skip", lambda s: s)  # No-op node

# Add edges
graph_builder.add_edge(START, "validate")
graph_builder.add_conditional_edges("validate", route_on_technical, {
    "categorize": "categorize",
    "skip": "skip"
})
graph_builder.add_edge("categorize", "score")
graph_builder.add_conditional_edges("score", route_on_score, {
    "index": "embed",
    "skip": "skip"
})
graph_builder.add_edge("embed", END)
graph_builder.add_edge("skip", END)

# Compile graph
agent = graph_builder.compile()

# Run on video
result = agent.invoke({
    "video_id": "abc123",
    "title": "Kafka Consumer Groups Explained",
    "description": "Deep dive into Kafka consumer group mechanics...",
    "url": "https://youtube.com/watch?v=abc123",
    "author": "TechChannel",
    "published_date": "2024-06-15",
    "is_technical": False,
    "categories": {},
    "metadata": {},
    "relevance_score": 0.0,
    "embeddings": [],
    "errors": []
})

print(f"Technical: {result['is_technical']}")
print(f"Category: {result['categories']}")
print(f"Relevance: {result['relevance_score']}")
print(f"Errors: {result['errors']}")
```

## Example 3: Search Agent

```python
class SearchState(TypedDict):
    query: str
    search_type: str  # "semantic" or "full_text"
    results: list
    learning_path: dict

# Semantic search using ChromaDB
def semantic_search_node(state: SearchState) -> SearchState:
    """Perform semantic search using embeddings"""
    
    from sentence_transformers import SentenceTransformer
    import chromadb
    
    # Embed the query
    model = SentenceTransformer("all-MiniLM-L6-v2")
    query_embedding = model.encode(state["query"])
    
    # Search ChromaDB
    client = chromadb.PersistentClient(path="./chroma_db")
    collection = client.get_collection(name="techcorp_rag")
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=10,
        include=["documents", "metadatas", "distances"]
    )
    
    state["results"] = results
    return state

# Learning path recommendation
def recommend_learning_path_node(state: SearchState) -> SearchState:
    """Build learning path from search results"""
    
    message = HumanMessage(
        content=f"""
Create a learning path from these videos to help someone learn about: {state['query']}

Videos found:
{json.dumps(state['results'], indent=2)}

Build an ordered learning path (3-5 videos) that:
1. Starts with fundamentals
2. Progresses to advanced topics
3. Each video builds on the previous

Return a JSON structure with:
- path: [video_ids in order]
- rationale: why this order
- gaps: what topics are missing
"""
    )
    
    response = agent_llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        message
    ])
    
    state["learning_path"] = json.loads(response.content)
    return state

# Build and run search graph
search_graph = StateGraph(SearchState)
search_graph.add_node("semantic_search", semantic_search_node)
search_graph.add_node("build_path", recommend_learning_path_node)
search_graph.add_edge(START, "semantic_search")
search_graph.add_edge("semantic_search", "build_path")
search_graph.add_edge("build_path", END)

search_agent = search_graph.compile()

result = search_agent.invoke({
    "query": "How does Kubernetes networking work?",
    "search_type": "semantic",
    "results": [],
    "learning_path": {}
})

print(f"Found {len(result['results'])} videos")
print(f"Recommended path: {result['learning_path']['path']}")
```

## Testing the System Prompt

```python
# Unit test: Verify categorization accuracy
def test_categorization():
    test_videos = [
        {
            "title": "Python Async/Await Deep Dive",
            "expected": "01_PROGRAMMING_LANGUAGE",
        },
        {
            "title": "Deploying Kubernetes on AWS",
            "expected": "04_DOCKER_KUBERNETES",  # Not cloud computing!
        },
        # ... more test cases
    ]
    
    correct = 0
    for video in test_videos:
        result = categorize_video(video["title"])
        if result["primary_category"] == video["expected"]:
            correct += 1
    
    f1_score = correct / len(test_videos)
    assert f1_score > 0.85, f"F1 score too low: {f1_score}"
    print(f"✅ Categorization test passed: {f1_score:.2%}")

# Integration test: Full pipeline
def test_full_pipeline():
    video = {
        "title": "Redis Persistence Mechanisms",
        "description": "Comprehensive guide to Redis RDB and AOF persistence...",
        "url": "https://youtube.com/watch?v=xyz789",
        "author": "DBWithLarry",
        "published_date": "2024-07-01",
    }
    
    result = agent.invoke(video)
    
    assert result["is_technical"] == True
    assert result["categories"]["primary_category"] == "08_DATABASES"
    assert result["relevance_score"] >= 0.7
    assert len(result["embeddings"]) == 384  # all-MiniLM-L6-v2 output size
    assert len(result["errors"]) == 0
    
    print("✅ Full pipeline test passed")

# Run tests
if __name__ == "__main__":
    test_categorization()
    test_full_pipeline()
```

## Tips for Effective Prompt Usage

1. **Keep Temperature Low**: Use 0.0-0.2 for categorization (deterministic)
2. **Use Tool Calling**: Define tools matching your functions for structured output
3. **Add Examples**: Include few-shot examples in the message content
4. **Validate Output**: Always parse & validate JSON responses
5. **Error Handling**: Use "Unknown" fields, never fail silently
6. **Batching**: Process multiple videos in a single request when possible
7. **Streaming**: Use streaming for long pipelines to avoid timeout
8. **Caching**: Cache categorization for duplicate/similar content

---

This example demonstrates how the system prompt guides agent behavior through all stages of the YouTube content discovery pipeline.

