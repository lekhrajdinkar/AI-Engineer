#!/usr/bin/env python3
"""
This script will check:
✓ LangChain and langchain-openai packages
✓ API key and base URL configuration
✓ Prompt template utilities

▶️ source /root/venv/bin/activate && python /root/code/verify_environment.py

---
✅ LangChain available (version: 1.2.6)
✅ OpenAI configuration found
   API Base: https://kodekey.ai.kodekloud.com/v1
✅ LLM connection test passed

"""
import os

import sys
import subprocess

def check_virtual_environment():
    """Check if virtual environment is active"""
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Virtual environment is active")
        return True
    else:
        print("❌ Virtual environment not detected")
        return False

def check_langchain_import():
    """Test LangChain imports"""
    try:
        import langchain
        from langchain_openai import ChatOpenAI
        print(f"✅ LangChain available (version: {langchain.__version__})")
        return True
    except ImportError as e:
        print(f"❌ LangChain import failed: {e}")
        return False

def check_openai_configuration():
    """Check OpenAI API configuration"""
    api_key = os.getenv("OPENAI_API_KEY")
    api_base = os.getenv("OPENAI_API_BASE")

    if api_key and api_base:
        print(f"✅ OpenAI configuration found")
        print(f"   API Base: {api_base}")
        return True
    else:
        print("❌ OpenAI configuration missing")
        return False

def test_basic_llm_call():
    """Test basic LLM functionality"""
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage

        # Create client with environment variables
        llm = ChatOpenAI(
            model="openai/gpt-4.1-mini",
            temperature=0
        )

        # Simple test message
        messages = [HumanMessage(content="Say 'Environment test successful' and nothing else.")]
        response = llm.invoke(messages)

        if "successful" in response.content.lower():
            print("✅ LLM connection test passed")
            return True
        else:
            print(f"❌ LLM test failed - unexpected response: {response.content}")
            return False

    except Exception as e:
        print(f"❌ LLM connection test failed: {str(e)}")
        return False

def main():
    print("🔧 Verifying Prompt Engineering Lab Environment...")
    print("=" * 50)

    checks = [
        check_virtual_environment,
        check_langchain_import,
        check_openai_configuration,
        test_basic_llm_call
    ]

    results = []
    for check in checks:
        try:
            result = check()
            results.append(result)
        except Exception as e:
            print(f"❌ Check failed with exception: {e}")
            results.append(False)
        print()

    if all(results):
        print("🎉 All environment checks passed!")
        print("Your prompt engineering lab environment is ready.")

        # Create success marker
        os.makedirs("/root/markers", exist_ok=True)
        with open("/root/markers/environment_verified.txt", "w") as f:
            f.write("ENVIRONMENT_VERIFIED")

        return True
    else:
        print(f"❌ {sum(1 for r in results if not r)} check(s) failed.")
        print("Please review the setup and try again.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)