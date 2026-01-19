# Prompt Engineering Lab ( with LangChain )

## Env setu and run
- Python 3.8+
- packages : `LangChain` and `langchain-openai`
- OpenAI API configuration (API key and base URL)
- [verify_env.py](verify_env.py) | [.env](../../../../.env)
- `python -m src.y2026.lab_01_ai_agent.prompt_eng_03.prompt_eng_test` ◀️

---
## Learning Objectives
-  Understand when to use each prompting technique
-  Write effective prompts that get consistent results
-  Control AI output format, tone, and style
-  Solve complex problems with structured reasoning
-  Compare techniques side-by-side for optimal selection

## Overview
1. **Zero-Shot Prompting** - Direct instructions without examples
2. **One-Shot Prompting** - Learning from a single example
3. **Few-Shot Prompting** - Multiple examples for consistency
4. **Chain-of-Thought** - Step-by-step reasoning

| Technique | Best For | Example Use Case |
|-----------|----------|------------------|
| **Zero-Shot** | • Quick queries<br>• General knowledge<br>• Simple tasks | "Explain machine learning in one sentence" |
| **One-Shot** | • Format consistency<br>• Template following<br>• Style replication | Company policy templates |
| **Few-Shot** | • Tone matching<br>• Complex patterns<br>• Customer service | Support ticket responses |
| **Chain-of-Thought** | • Problem solving<br>• Math/logic<br>• Multi-step tasks | Debugging complex issues |

### Zero-Shot Prompting
- **Definition**: Direct task request without examples
- **Strength**: Fast and flexible
- **Challenge**: May produce inconsistent results
- **Solution**: Be extremely specific in your instructions

### One-Shot Prompting
- **Definition**: Single example to demonstrate format
- **Strength**: Teaches structure instantly
- **Challenge**: Limited pattern complexity
- **Solution**: Choose your example carefully

### Few-Shot Prompting
- **Definition**: Multiple examples for pattern learning
- **Strength**: Consistent tone and style
- **Challenge**: Requires good example selection
- **Solution**: Provide diverse, representative examples

### Chain-of-Thought (CoT)
- **Definition**: Step-by-step reasoning process
- **Strength**: Handles complex problems
- **Challenge**: Can be verbose
- **Solution**: Structure your reasoning steps clearly

---
## More
### Industry Examples

1. **GitHub Copilot**: Uses few-shot learning from your codebase context
2. **ChatGPT**: Applies chain-of-thought for mathematical problems
3. **Amazon**: Leverages one-shot prompting for product descriptions
4. **Google**: Implements zero-shot for quick search summaries
5. **Customer Support AI**: Uses few-shot for empathetic responses

### Success Metrics

- **Zero-shot specificity**: 73% improvement with detailed prompts
- **One-shot format accuracy**: 96.66% on classification tasks
- **Few-shot consistency**: 97% accuracy with 3+ examples
- **Chain-of-thought reasoning**: 3x more detailed responses

---
## 📚 Additional Resources
- [LangChain Documentation](https://python.langchain.com/)
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Few-Shot Learning Research Papers](https://arxiv.org/search/cs?query=few-shot+prompting)
- [Chain-of-Thought Prompting Studies](https://arxiv.org/search/cs?query=chain-of-thought)