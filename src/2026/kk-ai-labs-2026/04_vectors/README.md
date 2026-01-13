> Remember: This lab focuses on **search and retrieval only** - no AI generation yet! 

## 🎯 Learning Objectives

By completing this lab, you will:
- ✅ Understand how embeddings capture semantic meaning
- ✅ Master asymmetric search with semantic embeddings
- ✅ Implement smart document chunking with overlap
- ✅ Build production vector stores with ChromaDB
- ✅ Create semantic search that understands meaning

## Setup Environment
```bash
cd python3 -m venv venv && source venv/bin/activate
pip install sentence-transformers langchain langchain-community langchain-huggingface chromadb numpy
python3 verify_environment.py
```

##  **Installing Vector Search Libraries**
```
✅ sentence-transformers - Embedding models from HuggingFace
✅ langchain - Abstraction framework
✅ langchain-community - Vector store integrations
✅ langchain-huggingface - HuggingFace embeddings integration
✅ chromadb - Production vector database
✅ numpy - Vector mathematics
```

## 🤖 **Models (auto-download on first use)**:
  - all-mpnet-base-v2 (768 dimensions - high accuracy)
  - all-MiniLM-L6-v2 (384 dimensions - fast)

## 📂 File Structure
```
├── verify_environment.py               # Environment verification
├── task_1_understanding_embeddings.py  # Understanding embeddings
├── task_2_document_processing.py       # Smart chunking 
├── task_3_vector_store.py              # ChromaDB setup 
├── task_4_semantic_search.py           # Search implementation 
```