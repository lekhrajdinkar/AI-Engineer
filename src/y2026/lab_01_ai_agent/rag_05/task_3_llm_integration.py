#!/usr/bin/env python3
"""
Task 3: LLM Integration
Configure the AI generation engine using pre-configured OpenAI API
"""
from sympy import false

def initialize_llm_and_test(is_test: bool = false):
    import os
    from langchain_openai import ChatOpenAI

    print("🤖 Task 3: LLM Integration")
    api_base = os.getenv("GROQ_API_BASE")
    api_key = os.getenv("GROQ_API_KEY")
    api_model = os.getenv("GROQ_MODEL_ID")
    llm = ChatOpenAI(
            api_key=(lambda: api_key),
            model=api_model,
            base_url=api_base,
            temperature=0.3
    )
    print(f"✅ OpenAI client initialized with:  {api_model} \n {api_base} \n {api_key}")
    if is_test:
        test_llm(llm)
    return llm


def test_llm(client):
    """Test basic LLM generation"""
    print(f"\n📝 Testing llm model...")

    try:
        from langchain_core.messages import HumanMessage
        prompt = HumanMessage(content="You are a helpful AI assistant.\n\nUser: What is RAG in AI? Answer in one sentence.")
        response = client.invoke([prompt])
        answer = getattr(response, 'content', response)
        print(f"\n🤖 Test Response: {answer}")
    except Exception as e:
        msg = str(e)
        print(f"❌ LLM test failed: {msg}")
