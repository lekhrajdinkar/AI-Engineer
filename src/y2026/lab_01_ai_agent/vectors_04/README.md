> Remember: This lab focuses on **search and retrieval only** - no AI generation yet! 
> can skip and cjeck next rag lab [rag_05](../rag_05)

## 🎯 Learning Objectives

By completing this lab, you will:
-  Understand how embeddings capture semantic meaning
-  Master asymmetric search with semantic embeddings
-  Implement smart document chunking with overlap
-  Build production vector stores with ChromaDB
-  Create semantic search that understands meaning

## Setup Environment
- lib:
```
 sentence-transformers - Embedding models from HuggingFace
 langchain - Abstraction framework
 langchain-community - Vector store integrations
 langchain-huggingface - HuggingFace embeddings integration
 chromadb - Production vector database
 numpy - Vector mathematics
```

```bash
# cd python3 -m venv venv && source venv/bin/activate
pip install sentence-transformers langchain langchain-community langchain-huggingface chromadb numpy

python -m src.y2026.lab_01_ai_agent.lab_01_openai.task_1_understanding_embeddings
python -m src.y2026.lab_01_ai_agent.lab_01_openai.task_2_document_processing
python -m src.y2026.lab_01_ai_agent.lab_01_openai.task_3_vector_store
python -m src.y2026.lab_01_ai_agent.lab_01_openai.task_4_semantic_search
```


-  **Embedding Models (auto-download on first use)**:
  - **all-mpnet-base-v2** (768 dimensions - high accuracy)
  - **all-MiniLM-L6-v2** (384 dimensions - fast)