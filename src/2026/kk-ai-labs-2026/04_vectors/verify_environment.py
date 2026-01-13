#!/usr/bin/env python3
"""
Environment Verification for Vector Database Lab
Verifies ChromaDB, embedding models, and all required dependencies.
"""

import os
import sys
import tempfile
import shutil

def check_virtual_environment():
    """Check if virtual environment is active"""
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Virtual environment is active")
        return True
    else:
        print("❌ Virtual environment not detected")
        return False

def check_chromadb_import():
    """Test ChromaDB import and basic functionality"""
    try:
        import chromadb
        print(f"✅ ChromaDB available (version: {chromadb.__version__})")

        # Test basic client creation
        with tempfile.TemporaryDirectory() as temp_dir:
            client = chromadb.PersistentClient(path=temp_dir)
            collection = client.create_collection("test")
            print("✅ ChromaDB client and collection creation successful")

        return True
    except ImportError as e:
        print(f"❌ ChromaDB import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ ChromaDB functionality test failed: {e}")
        return False

def check_embedding_models():
    """Test sentence-transformers and embedding functionality"""
    try:
        from sentence_transformers import SentenceTransformer

        # Test with a lightweight model
        print("🔄 Loading embedding model (this may take a moment)...")
        model = SentenceTransformer('all-MiniLM-L6-v2')

        # Test embedding generation
        test_text = "This is a test sentence for embedding."
        embedding = model.encode(test_text)

        print(f"✅ Sentence-transformers available, embedding dimension: {len(embedding)}")
        return True
    except ImportError as e:
        print(f"❌ Sentence-transformers import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Embedding model test failed: {e}")
        return False

def check_langchain_integration():
    """Test LangChain integration with embeddings and vector stores"""
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
        from langchain_community.vectorstores import Chroma
        from langchain.text_splitter import CharacterTextSplitter

        print("✅ LangChain vector store components available")

        # Test basic integration
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        test_texts = ["Test document one", "Test document two"]

        with tempfile.TemporaryDirectory() as temp_dir:
            vectorstore = Chroma.from_texts(
                texts=test_texts,
                embedding=embeddings,
                persist_directory=temp_dir
            )

            # Test search
            results = vectorstore.similarity_search("Test document", k=1)
            if results:
                print("✅ LangChain-ChromaDB integration working")
                return True
            else:
                print("❌ LangChain-ChromaDB search test failed")
                return False

    except ImportError as e:
        print(f"❌ LangChain integration import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ LangChain integration test failed: {e}")
        return False

def check_openai_configuration():
    """Check OpenAI configuration for comparison"""
    api_key = os.getenv("OPENAI_API_KEY")
    api_base = os.getenv("OPENAI_API_BASE")

    if api_key and api_base:
        print(f"✅ OpenAI configuration found")
        print(f"   API Base: {api_base}")
        return True
    else:
        print("⚠️  OpenAI configuration missing (optional for this lab)")
        return True  # Not critical for vector database lab

def test_vector_operations():
    """Test core vector operations"""
    try:
        import numpy as np
        from sentence_transformers import SentenceTransformer
        import chromadb

        print("🔄 Testing vector similarity operations...")

        # Load model and create embeddings
        model = SentenceTransformer('all-MiniLM-L6-v2')

        # Test documents with varying similarity
        docs = [
            "Cloud storage and data backup solutions",
            "Secure cloud data management and storage",
            "Weather forecast for tomorrow",
            "Machine learning and artificial intelligence"
        ]

        embeddings = model.encode(docs)

        # Test similarity calculation
        from sklearn.metrics.pairwise import cosine_similarity

        # Compare first two (should be similar)
        sim_similar = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]

        # Compare first and third (should be different)
        sim_different = cosine_similarity([embeddings[0]], [embeddings[2]])[0][0]

        print(f"✅ Vector similarity test:")
        print(f"   Similar docs similarity: {sim_similar:.3f}")
        print(f"   Different docs similarity: {sim_different:.3f}")

        if sim_similar > sim_different:
            print("✅ Vector operations working correctly")
            return True
        else:
            print("❌ Vector similarity not working as expected")
            return False

    except ImportError as e:
        print(f"❌ Vector operations test failed - import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Vector operations test failed: {e}")
        return False

def main():
    print("🔧 Verifying Vector Database Lab Environment...")
    print("=" * 55)

    checks = [
        check_virtual_environment,
        check_chromadb_import,
        check_embedding_models,
        check_langchain_integration,
        check_openai_configuration,
        test_vector_operations
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

    # Count successful checks
    successful = sum(results)
    total = len(results)
    critical_passed = results[0] and results[1] and results[2]  # venv, chromadb, embeddings

    if successful == total:
        print("🎉 All environment checks passed!")
        print("Your vector database lab environment is fully ready.")
        status = "PERFECT"
    elif critical_passed:
        print(f"✅ Critical checks passed ({successful}/{total} total)")
        print("Your vector database lab environment is ready.")
        status = "READY"
    else:
        print(f"❌ Critical checks failed ({successful}/{total} total)")
        print("Please review the setup and try again.")
        status = "FAILED"

    # Create success marker
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/vector_env_verified.txt", "w") as f:
        f.write(f"VECTOR_ENV_VERIFIED_{status}")

    print(f"\n📊 Environment Status: {status}")
    print(f"📁 Results saved to: /root/markers/environment_verified.txt")

    return successful >= len(checks) - 1  # Allow one optional check to fail

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)