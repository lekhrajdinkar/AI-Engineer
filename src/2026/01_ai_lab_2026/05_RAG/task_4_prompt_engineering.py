#!/usr/bin/env python3

import os
from langchain_openai import ChatOpenAI

print("📝 Task 4: Prompt Engineering")
print("=" * 50)

# Initialize LangChain ChatOpenAI client
api_base = os.getenv("OPENAI_API_BASE")
api_key = os.getenv("OPENAI_API_KEY")
client = ChatOpenAI(
    api_key=api_key,
    base_url=api_base,
    model="openai/gpt-4.1-mini",
    temperature=0.3,
    max_tokens=200
)
print("✅ OpenAI client ready")

def create_rag_prompt(context_chunks, user_question):
    """Create the RAG prompt with context and question"""

    # TODO 1:  System prompt
    # Hint: The AI should answer "ONLY" based on provided context
    system_prompt = """You are TechCorp's helpful AI assistant.
Answer ONLY based on the provided context.
If the answer is not in the context, say: 'I don't have that information in the provided documents.'
Be concise and accurate."""

    # TODO 2: Build context section from retrieved chunks
    # Hint: Format each chunk as [Document N] followed by content
    context_text = "Context from TechCorp documents:\n\n"
    for i, chunk in enumerate(context_chunks, 1):
        context_text += f"[Document {i}]\n{chunk}\n\n"  # Replace ___ with chunk

    # TODO 3: Create the user prompt with context and question
    # Hint: Include context_text and user_question
    user_prompt = f"""
{context_text}

Question: {user_question}

Answer:"""  # Replace ___ with user_question

    return system_prompt, user_prompt

# Test the prompt template
def test_prompt_engineering():
    """Test the prompt template with sample data"""

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

    response = client.invoke(messages)
    answer = response.content
    print("\n🤖 Generated Answer:")
    print("-" * 40)
    print(answer)

    return True

# Run the test
try:
    success = test_prompt_engineering()

    print("\n" + "=" * 50)
    print("🎉 Prompt Engineering Complete!")
    print("   - System prompt: Context-aware")
    print("   - User prompt: Structured with context")
    print("   - Answer: Based on provided documents")
    print("   - Ready for complete RAG pipeline!")
    print("=" * 50)

    # Create marker file
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/task4_prompt_complete.txt", "w") as f:
        f.write("TASK4_COMPLETE:PROMPT_READY")

except Exception as e:
    print(f"\n❌ Error: {e}")

print("\n💡 The RAG prompt formula ensures accurate, context-based answers!")
print("\n✅ Task 4 completed!")


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

💡 The RAG prompt formula ensures accurate, context-based answers!

✅ Task 4 completed!
"""