#!/usr/bin/env python3
"""
Environment Verification for RAG Lab
Checks all dependencies and configurations
"""

import os
import sys

def check_virtual_environment():
    """Check if virtual environment is active"""
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Virtual environment is active")
        return True
    else:
        print("⚠️  Virtual environment not detected (optional)")
        return True  # Not critical

def check_imports():
    """Check if all required packages can be imported"""
    packages = {
        'chromadb': 'ChromaDB (vector database)',
        'sentence_transformers': 'Sentence Transformers (embeddings)',
        'langchain': 'LangChain (RAG framework)',
        'langchain_openai': 'LangChain OpenAI (LLM integration)',
        'numpy': 'NumPy (vector operations)'
    }

    all_good = True
    for package, description in packages.items():
        try:
            __import__(package)
            print(f"✅ {description} available")
        except ImportError:
            print(f"❌ {description} missing - run: pip install {package}")
            all_good = False

    return all_good

def check_openai_config():
    """Check OpenAI API configuration"""
    api_base = os.getenv("OPENAI_API_BASE")
    api_key = os.getenv("OPENAI_API_KEY")

    if api_base and api_key:
        print(f"✅ OpenAI configuration found")
        print(f"   API Base: {api_base}")
        return True
    else:
        print("❌ OpenAI configuration missing")
        print("   Set OPENAI_API_BASE and OPENAI_API_KEY environment variables")
        return False

def check_documents():
    """Check if TechCorp documents exist"""
    doc_dir = "/root/techcorp-docs"
    if os.path.exists(doc_dir):
        doc_count = sum(1 for root, dirs, files in os.walk(doc_dir) for file in files if file.endswith('.md'))
        print(f"✅ TechCorp documents found: {doc_count} files")
        return True
    else:
        print(f"⚠️  TechCorp documents not found at {doc_dir}")
        print("   They will be created during the lab")
        return True  # Not critical for initial setup

def main():
    print("🔧 RAG Lab Environment Verification")
    print("=" * 50)

    checks = [
        ("Python Environment", check_virtual_environment),
        ("Required Packages", check_imports),
        ("OpenAI Configuration", check_openai_config),
        ("Document Repository", check_documents)
    ]

    results = []
    for name, check_func in checks:
        print(f"\n📋 Checking {name}:")
        result = check_func()
        results.append(result)

    print("\n" + "=" * 50)

    if all(results):
        print("🎉 Environment ready for RAG lab!")
        status = "READY"
    elif results[1] and results[2]:  # Packages and OpenAI config are critical
        print("✅ Core components ready (some optional items missing)")
        status = "READY"
    else:
        print("❌ Environment setup incomplete")
        print("\n📝 To set up:")
        print("1. Install packages: pip install chromadb sentence-transformers langchain langchain-openai")
        print("2. Set environment variables: OPENAI_API_BASE and OPENAI_API_KEY")
        status = "INCOMPLETE"

    # Create marker file
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/environment_verified.txt", "w") as f:
        f.write(f"ENV_STATUS:{status}")

    print(f"\n📊 Status: {status}")

    return all(results[:3])  # First 3 checks are important

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

"""
 RAG Lab Environment Verification
==================================================

📋 Checking Python Environment:
✅ Virtual environment is active

📋 Checking Required Packages:
✅ ChromaDB (vector database) available
✅ Sentence Transformers (embeddings) available
✅ LangChain (RAG framework) available
✅ LangChain OpenAI (LLM integration) available
✅ NumPy (vector operations) available

📋 Checking OpenAI Configuration:
✅ OpenAI configuration found
   API Base: https://kodekey.ai.kodekloud.com/v1

📋 Checking Document Repository:
✅ TechCorp documents found: 15 files

==================================================
🎉 Environment ready for RAG lab!

📊 Status: READY
"""