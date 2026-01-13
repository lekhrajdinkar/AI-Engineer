## Lab Structure
### Recap
![img_1.png](../../../../docs/99_img/2026/01/05/img_4.png)

### Task 1: Vector Store Setup 🔧
**File:** `task_1_setup_vectorstore.py`
- Initialize ChromaDB client with persistent storage
- Create collection for TechCorp documents
- Set up embedding model (all-MiniLM-L6-v2)
  ![img.png](../../../../docs/99_img/2026/01/05/img.png)

### Task 2: Document Processing 📄
**File:** `task_2_document_processing.py`
- Implement smart paragraph-based chunking
- Add 20% overlap for context preservation
- Store documents with metadata (source, section)
- ![img_1.png](../../../../docs/99_img/2026/01/05/img_1.png)

### Task 3: LLM Integration 🤖
**File:** `task_3_llm_integration.py`
- Configure LangChain ChatOpenAI client
- Set temperature (0.3) for focused answers
- Configure max tokens (500) for concise responses
- ![img_2.png](../../../../docs/99_img/2026/01/05/img_2.png)

### Task 4: Prompt Engineering 📝
**File:** `task_4_prompt_engineering.py`
- Create system prompt for context-aware answers
- Build user prompt with retrieved chunks
- Format prompts for optimal generation

### Task 5: Complete RAG Pipeline 🚀
**File:** `task_5_complete_rag.py`
- Wire together all components
- Implement the complete RAG flow
- Add source citations to answers
- ![img_3.png](../../../../docs/99_img/2026/01/05/img_3.png)


---
## 🚦 Getting Started
### 1. Environment Setup
```bash
# Activate virtual environment
source /root/venv/bin/activate

# Verify environment
python3 /root/code/verify_environment.py
```

### 2. Required Packages
- `chromadb` - Vector database
- `sentence-transformers` - Embeddings
- `langchain` - RAG framework
- `langchain-openai` - LLM integration
- `numpy` - Vector operations

### 3. Environment Variables
```bash
export OPENAI_API_BASE="http://localhost:8080/v1"
export OPENAI_API_KEY="dummy-key-for-proxy"
```

### 📂 Document Collection
Your TechCorp documents are in `/root/techcorp-docs/`:
- **policies/** - Company policies and guidelines
- **products/** - Product specifications
- **support/** - Support documentation

