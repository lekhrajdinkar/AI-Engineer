#!/usr/bin/env python3
"""
Task 2: Smart Document Processing
Implement paragraph-based chunking for better RAG context
"""

import os
import chromadb
from sentence_transformers import SentenceTransformer
from pathlib import Path

print("📄 Task 2: Smart Document Processing")
print("=" * 50)

# Initialize components from Task 1
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("techcorp_rag")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("✅ Loaded vector store and embedding model")

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
doc_dir = Path("/root/techcorp-docs")
total_chunks = 0
docs_processed = 0

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

# Create marker file
os.makedirs("/root/markers", exist_ok=True)
with open("/root/markers/task2_processing_complete.txt", "w") as f:
    f.write(f"TASK2_COMPLETE:DOCS={docs_processed},CHUNKS={total_chunks}")

print("\n💡 Smart chunking preserves context for better generation!")
print("\n✅ Task 2 completed!")


"""
root@controlplane ~/techcorp-docs via 🐍 v3.12.3 (venv) ➜  pwd
/root/techcorp-docs

root@controlplane ~/techcorp-docs via 🐍 v3.12.3 (venv) ➜  ls -l
total 28
drwxr-xr-x 2 root root 4096 Oct 28 04:41 customer-faqs
drwxr-xr-x 2 root root 4096 Oct 28 04:41 employee-handbook
drwxr-xr-x 2 root root 4096 Oct 28 04:41 meeting-notes
drwxr-xr-x 2 root root 4096 Oct 28 04:41 policies
drwxr-xr-x 2 root root 4096 Oct 28 04:41 product-specs
drwxr-xr-x 2 root root 4096 Oct 28 04:41 products
drwxr-xr-x 2 root root 4096 Oct 28 04:41 support

---

📄 Task 2: Smart Document Processing
==================================================
✅ Loaded vector store and embedding model

📂 Processing product-specs:
   ✅ cloudsync-pro.md: 36 chunks
   ✅ datavault.md: 44 chunks

📂 Processing products:
   ✅ datasync.md: 7 chunks
   ✅ cloudpro.md: 9 chunks

📂 Processing policies:
   ✅ pet-policy.md: 5 chunks
   ✅ remote-work.md: 7 chunks
   ✅ vacation.md: 7 chunks

📂 Processing support:
   ✅ troubleshooting.md: 11 chunks
   ✅ faq.md: 10 chunks

📂 Processing meeting-notes:
   ✅ product-launch-review.md: 37 chunks
   ✅ q3-planning-meeting.md: 33 chunks

📂 Processing employee-handbook:
   ✅ remote-work-policy.md: 33 chunks
   ✅ benefits-overview.md: 27 chunks
   ✅ pet-policy.md: 18 chunks

📂 Processing customer-faqs:
   ✅ general-faqs.md: 43 chunks

==================================================
🎉 Document Processing Complete!
   - Documents processed: 15
   - Total chunks created: 327
   - Collection size: 327
==================================================

💡 Smart chunking preserves context for better generation!

✅ Task 2 completed!
"""