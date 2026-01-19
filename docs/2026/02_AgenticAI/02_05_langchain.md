# langchain
- [lab_01_lanchain.py](../../../src/y2026/lab_01_ai_agent/lab_02_lanchain.py)

## ✔️Overview
- **framework** for:
  - building RAG appl
  - abstraction over switching multiple LLM
  - **orchestrate component** in agentic Application
    - ![img.png](../../99_img/2026/01/02/img.png)

---
## ✔️LangChain Advantage
- One interface, infinite possibilities.
- Switch between providers with a single line change. No more vendor lock-in!
- Build **reusable templates** that work everywhere
- Transform messy AI text into clean data structures
- Build reusable templates that work everywhere
- Test OpenAI, Google, and X.AI with identical code

### prompt template
```
- template-1 = "Explain {topic} in {style}"
    - "Explain quantum computing in simple terms"
    - "Explain machine learning in simple terms"
```

### Output Parsers
- Tools that transform **unstructured AI text** into **structured Python data** (lists, dicts, objects) our code can actually use.
- translator between **human-readable AI responses** and **computer-friendly data structures**
```
- from langchain_core.output_parsers import 
  - StrOutputParser, 
  - JsonOutputParser, 
  - CommaSeparatedListOutputParser
```

### Chain Composition
- Connecting LangChain components with the | operator to create data pipelines - like Unix pipes for AI.
- chain = prompt | llm | parser
- ![img.png](../../99_img/2026/01/03/img-2.png)

