#!/usr/bin/env python3
"""
Task 3: LLM Integration
Configure the AI generation engine using pre-configured OpenAI API
"""
from sympy import false


def initialize_llm_and_test(is_test: bool = false):
    import os
    from dotenv import load_dotenv
    from langchain_openai import ChatOpenAI

    load_dotenv()
    api_base = os.getenv("OPENAI_API_BASE")
    api_key = os.getenv("OPENAI_API_KEY_2")
    api_model = os.getenv("OPENAI_MODEL_ID")
    api_vendor = os.getenv("OPENAI_VENDOR")

    print("🤖 Task 3: LLM Integration")
    llm = ChatOpenAI(
            api_key=(lambda: api_key),
            model=api_model,
            base_url=api_base,
            temperature=0.3
    )
    print(f"✅ OpenAI client initialized with: \n {api_vendor} \n {api_model} \n {api_base} \n {api_key}")
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
