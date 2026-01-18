#!/usr/bin/env python3
"""
Task 2: Smart Document Processing
Implement paragraph-based chunking for better RAG context
"""

import chromadb
from sentence_transformers import SentenceTransformer
from pathlib import Path

path1=r"C:\Users\Manisha\Documents\github-2025\genai\src\y2026\lab_01_ai_agent\rag_05\techcorp-docs"

def load_store():
    print("📄 Task 2: Smart Document Processing")

    client = chromadb.PersistentClient(path="./chroma_db")
    collection = client.get_or_create_collection("techcorp_rag")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Loaded vector store and embedding model")
    return {
        "chroma_collection":collection,
        "embed_model":model
    }

def smart_chunk_document(text, overlap_ratio=0.2):
    """
    Smart paragraph-based chunking with overlap
    """
    # 1: Split document into paragraphs
    paragraphs = text.split("\n\n")

    chunks = []
    for i in range(len(paragraphs)):
        chunk_parts = []

        # Add current paragraph
        chunk_parts.append(paragraphs[i])

        # Add next paragraph if exists
        if i + 1 < len(paragraphs):
            chunk_parts.append(paragraphs[i + 1])

        # 2: Calculate overlap characters (20% of previous paragraph)
        # Hint: Use int(len(paragraphs[i-1]) * overlap_ratio)
        if i > 0 and overlap_ratio > 0:
            overlap_chars = int(len(paragraphs[i-1]) * overlap_ratio)
            if overlap_chars > 0:
                chunk_parts.insert(0, paragraphs[i-1][-overlap_chars:])

        chunk = " ".join(chunk_parts)
        chunks.append(chunk)

    return chunks

# Process documents
def process_doc(result):
    doc_dir = Path(path1)
    total_chunks = 0
    docs_processed = 0

    collection=result['chroma_collection']
    model=result['embed_model']

    for category_dir in doc_dir.iterdir():
        if category_dir.is_dir():
            print(f"\n📂 Processing {category_dir.name}:")

            for doc_file in category_dir.glob("*.md"):
                # 3: Create metadata for document tracking
                # Hint: Use doc_file.name for source, category_dir.name for section
                metadata = {
                    "source": doc_file.name,
                    "section": category_dir.name
                }

                # Read and process document
                with open(doc_file, "r") as f:
                    content = f.read()

                # Chunk the document
                chunks = smart_chunk_document(content)

                # Store chunks in vector database
                for i, chunk in enumerate(chunks):
                    chunk_id = f"{category_dir.name}_{doc_file.stem}_chunk_{i}"
                    embedding = model.encode(chunk).tolist()

                    collection.add(
                        ids=[chunk_id],
                        embeddings=[embedding],
                        documents=[chunk],
                        metadatas=[metadata]
                    )
                    total_chunks += 1

                docs_processed += 1
                print(f"   ✅ {doc_file.name}: {len(chunks)} chunks")

    print("\n" + "=" * 50)
    print("🎉 Document Processing Complete!")
    print(f"   - Documents processed: {docs_processed}")
    print(f"   - Total chunks created: {total_chunks}")
    print(f"   - Collection size: {collection.count()}")
    print("=" * 50)


def main():
    result=load_store()
    process_doc(result)


if __name__ == "__main__":
    main()



"""
python -m src.y2026.lab_01_ai_agent.rag_05.rag_test

📄 Task 2: Smart Document Processing
Loaded vector store and embedding model

📂 Processing compliance:
   ✅ compliance-1.md: 4 chunks
   ✅ compliance-2.md: 4 chunks

📂 Processing finance:
   ✅ finance-1.md: 4 chunks
   ✅ finance-2.md: 4 chunks

==================================================
🎉 Document Processing Complete!
   - Documents processed: 4
   - Total chunks created: 16
   - Collection size: 16
==================================================


"""