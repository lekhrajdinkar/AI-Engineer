#!/usr/bin/env python3

import os

from src.y2026.lab_01_ai_agent.rag_05.task_3_llm_integration import initialize_llm_and_test


def create_rag_prompt(context_chunks, user_question):
    """Create the RAG prompt with context and question"""
    # ACTION 1:  System prompt
    system_prompt = """
    You are TechCorp's helpful AI assistant.
    Answer ONLY based on the provided context.
    If the answer is not in the context, say: 'I don't have that information in the provided documents.'
    Be concise and accurate.
    """

    # ACTION 2: Build context section from retrieved chunks
    context_text = "Context from TechCorp documents:\n\n"
    for i, chunk in enumerate(context_chunks, 1):
        context_text += f"[Document {i}]\n{chunk}\n\n"  # Replace ___ with chunk

    # ACTION 3: Create the user prompt with context and question
    user_prompt = f"""
    {context_text}
    Question: {user_question}
    Answer:"""

    return system_prompt, user_prompt


# Test the prompt template
def test_prompt_engineering():
    """Test the prompt template with sample data"""
    llm = initialize_llm_and_test()

    # Sample retrieved chunks
    test_chunks = [
        "TechCorp allows employees to work remotely up to 3 days per week. Core hours are 10 AM to 3 PM.",
        "Remote work arrangements must be approved by your manager and documented with HR.",
        "VPN is mandatory when accessing company resources from home."
    ]

    test_question = "How many days can I work from home?"

    system_prompt, user_prompt = create_rag_prompt(test_chunks, test_question)

    print("📋 System Prompt:")
    print("-" * 40)
    print(system_prompt)

    print("\n📋 User Prompt (question + context):")
    print("-" * 40)
    print(user_prompt[:500] + "..." if len(user_prompt) > 500 else user_prompt)

    # Test with LangChain ChatOpenAI
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    response = llm.invoke(messages)
    answer = response.content
    print("\n🤖 Generated Answer:")
    print("-" * 40)
    print(answer)
    return True



"""
📝 Task 4: Prompt Engineering
==================================================
✅ OpenAI client ready
📋 System Prompt:
----------------------------------------
You are TechCorp's helpful AI assistant.
Answer ONLY based on the provided context.
If the answer is not in the context, say: 'I don't have that information in the provided documents.'
Be concise and accurate.

📋 User Prompt (question + context):
----------------------------------------

Context from TechCorp documents:

[Document 1]
TechCorp allows employees to work remotely up to 3 days per week. Core hours are 10 AM to 3 PM.

[Document 2]
Remote work arrangements must be approved by your manager and documented with HR.

[Document 3]
VPN is mandatory when accessing company resources from home.

Question: How many days can I work from home?

Answer:

🤖 Generated Answer:
----------------------------------------
You can work from home up to 3 days per week.

==================================================
🎉 Prompt Engineering Complete!
   - System prompt: Context-aware
   - User prompt: Structured with context
   - Answer: Based on provided documents
   - Ready for complete RAG pipeline!
==================================================

"""