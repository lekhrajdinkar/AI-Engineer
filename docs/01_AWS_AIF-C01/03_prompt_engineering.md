## prompt
- input text or instruction you give to a foundation model FM
- prompt = user **input** + instruction (task description itself) + context + output format
- **stateless** unless , build a conversational memory
- **Prompt Engineering** is the practice of designing prompts to get accurate, useful, and reliable model outputs.
- Parameters like temperature, top-p, system instructions, and few-shot examples all affect prompt behavior.
- Used heavily in RAG, chatbots, agent-based tools

```json

{
  "model": "anthropic.claude-v2",
  "prompt": "Summarize the AWS Bedrock architecture in 3 bullet points.",
  "temperature": 0.7,
  "max_tokens": 200
}


```

  | **Component**     | **Example**                                      |
  |-------------------| ------------------------------------------------ |
  | **Instruction**   | “Summarize the following text.”                  |
  | **Input Context** | “The quick brown fox jumps over the lazy dog...” |
  | **Output Format** | “Return bullet points.”                          |
  | **context**       | “”     |

## prompt parameters
- prompt : “Write a short description of a sunset.”

| **Setting**                | **Parameter Values**                         | **Expected Output Style**                         | **Example Output**                                                  |
| -------------------------- | -------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| **Greedy (Deterministic)** | `temperature=0.0`                            | Most likely tokens only (boring but consistent)   | “The sun sets beyond the horizon, casting a warm glow.”             |
| **Top-K Sampling**         | `top_k=50`, `temperature=0.7`                | Picks from top 50 likely tokens                   | “The sky explodes in hues of gold and violet as the sun dips.”      |
| **Top-P Sampling**         | `top_p=0.9`, `temperature=0.8`               | Chooses tokens with cumulative probability ≤ 90%  | “A watercolor sky melts into night, painted by the last light.”     |
| **Creative Sampling**      | `top_k=100`, `top_p=0.95`, `temperature=1.0` | Creative, diverse, sometimes poetic or surprising | “The day exhales a breath of fire before surrendering to twilight.” |


## prompt strategies
```
                    ┌────────────────────────┐
                    │   Prompt Engineering   │
                    └──────────┬─────────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
  ┌─────▼─────┐                               ┌───────▼────────┐
  │ Direct    │                               │ Structured     │
  │ Prompting │                               │ Prompting      │
  └─────┬─────┘                               └───────┬────────┘
        │                                            │
┌───────▼───────┐                        ┌───────────▼───────────┐
│ Zero-shot     │                        │ Chain of Thought (CoT)│
│ Few-shot      │                     
└───────────────┘                        └───────────────────────┘
                    ┌────────────┐
                    │    RAG     │ ← (external context)
                    └────────────┘

```

| **Technique**                             | **Description**                                                                      | **Example Prompt**                                                                                | **Use Case**                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |---------------------------------------------------------------------------------------------------| ----------------------------------- |
| **Zero-shot**                             | Ask a question directly without examples.                                            | “Translate to French: ‘Good morning.’”                                                            | Simple tasks, direct questions      |
| **Few-shot**                              | Provide a few examples, then ask for new output.                                     | “Translate:\n- Hello → Bonjour\n- Thank you → Merci\n- Goodbye →”                                 | Pattern learning without training   |
| **Chain-of-Thought (CoT)**                | Ask the model to reason step-by-step before answering.                               | “If Sarah has 3 apples and buys 2 more, how many apples does she have? Let’s think step by step.” | Math, logic, reasoning              |
| **RAG (Retrieval-Augmented Generation)**  | Retrieve external data (e.g., from documents or a DB) and inject it into the prompt. | “Context: \[doc chunk]\nQuestion: What is investment strategy?”                      | Internal search, domain-specific QA |


## check more ❓
```
Python examples using LangChain or Bedrock
RAG implementation flow (with vector store + prompt)
Practice questions
```
