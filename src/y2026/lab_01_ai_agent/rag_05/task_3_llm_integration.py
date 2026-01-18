#!/usr/bin/env python3
"""
Task 3: LLM Integration
Configure the AI generation engine using pre-configured OpenAI API
"""



def initialize_llm_and_test():
    import os
    from dotenv import load_dotenv
    from langchain_openai import ChatOpenAI

    load_dotenv()
    api_base = os.getenv("OPENAI_API_BASE")
    api_key = os.getenv("OPENAI_API_KEY")
    api_model = os.getenv("OPENAI_MODEL_ID") or os.getenv("OPENAI_MODEL")
    api_vendor = os.getenv("OPENAI_VENDOR")

    print("🤖 Task 3: LLM Integration")

    # Basic validation of API key to avoid calling the provider with an empty/placeholder key
    if not api_key:
        print("❌ OPENAI_API_KEY is not set. Set it in your environment or in a .env file.")
        print("   Example (PowerShell): $env:OPENAI_API_KEY = 'sk-...'")
        return

    try:
        # Pass api_key as a callable to satisfy typed signature expected by some LangChain wrappers
        llm = ChatOpenAI(
            api_key=(lambda: api_key),
            model=api_model,
            base_url=api_base,
            temperature=0.3
            #max_tokens=100
        )
    except Exception as e:
        print(f"❌ Failed to initialize ChatOpenAI client: {e}")
        return

    print(f"✅ OpenAI client initialized with: \n {api_vendor} \n {api_model} \n {api_base} \n {api_key}")
    test_llm(llm)


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
        # Provide actionable guidance for authentication issues
        if "Invalid API Key" in msg or "401" in msg or "AuthenticationError" in msg:
            print("   Authentication failed. Verify OPENAI_API_KEY and OPENAI_API_BASE (if using a proxy).")
            print("   In PowerShell you can set it for this session: $env:OPENAI_API_KEY = 'sk-...' ")
        else:
            print("   Unexpected error when calling LLM. Check network, API base URL, and model name.")
        # Do not re-raise; we've handled the error gracefully
        return
