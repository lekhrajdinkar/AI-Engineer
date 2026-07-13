"""
                User Query
                     │
                     ▼
             Vectorizer (Embeddings)
                     │
                     ▼
         +-----------------------+
         |   Semantic Cache      |
         +-----------------------+
            │ Hit        │ Miss
            ▼            ▼
     Return cached   Query Builder
                        │
                        ▼
              Hybrid Search Query
                        │
                        ▼
                Redis Vector Index
                        │
                        ▼
                 Top Matching Docs

This flow demonstrates how the primitives complement each other:

- Schema defines the Redis index, including metadata fields, vector dimensions, and HNSW indexing configuration.
- Vectorizer converts text into embeddings with a consistent API.
- Query Builder constructs semantic or hybrid (vector + metadata filter) searches without writing raw Redis queries.
- SemanticCache avoids repeated LLM calls by returning cached responses for semantically similar prompts, reducing latency and cost.

"""
# 1
# pip install redis redisvl sentence-transformers
# redis://localhost:6379

# 2. Create a Vector Index
from redisvl.index import SearchIndex

schema = {
    "index": {
        "name": "products",
        "prefix": "product",
        "storage_type": "hash"
    },
    "fields": [
        {
            "name": "id",
            "type": "tag"
        },
        {
            "name": "category",
            "type": "tag"
        },
        {
            "name": "price",
            "type": "numeric"
        },
        {
            "name": "description",
            "type": "text"
        },
        {
            "name": "embedding",
            "type": "vector",
            "attrs": {
                "dims": 384,
                "distance_metric": "cosine",
                "algorithm": "hnsw",
                "datatype": "float32"
            }
        }
    ]
}

index = SearchIndex.from_dict(schema)
index.connect("redis://localhost:6379")
index.create(overwrite=True)

# 3. Generate Embeddings (Vectorizer)
from redisvl.utils.vectorize import HFTextVectorizer

vectorizer = HFTextVectorizer(
    model="sentence-transformers/all-MiniLM-L6-v2"
)

# 4 Insert Documents
products = [
    {
        "id": "1",
        "category": "electronics",
        "price": 999,
        "description": "Apple MacBook Pro with M4 processor"
    },
    {
        "id": "2",
        "category": "electronics",
        "price": 799,
        "description": "Dell XPS laptop with Intel processor"
    },
    {
        "id": "3",
        "category": "kitchen",
        "price": 99,
        "description": "Coffee maker with programmable timer"
    }
]

for product in products:
    product["embedding"] = vectorizer.embed(product["description"])

index.load(products)

# 5.1 Semantic Search
from redisvl.query import VectorQuery

query_vector = vectorizer.embed(
    "fast laptop for software development"
)

query = VectorQuery(
    vector=query_vector,
    vector_field_name="embedding",
    return_fields=[
        "id",
        "description",
        "price"
    ],
    num_results=2
)

results = index.query(query)

for doc in results:
    print(doc)

# 5.2 Hybrid Search (Vector + Filters)
from redisvl.query import VectorQuery

query = VectorQuery(
    vector=query_vector,
    vector_field_name="embedding",
    filter_expression="@category:{electronics} @price:[0 900]",
    return_fields=[
        "id",
        "description",
        "price"
    ],
    num_results=5
)

results = index.query(query)

for doc in results:
    print(doc)

# 6.Semantic Cache
from redisvl.extensions.cache import SemanticCache

cache = SemanticCache(
    name="llm-cache",
    redis_url="redis://localhost:6379",
    distance_threshold=0.1
)

cache.store(
    prompt="What is RedisVL?",
    response="RedisVL is a Python library for building vector search applications."
)

cached = cache.check(prompt="Explain RedisVL")

if cached:
    print("Cache hit!")
    print(cached["response"])
else:
    print("Cache miss")