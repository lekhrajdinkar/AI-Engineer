#!/usr/bin/env python3

import os
import chromadb
from sentence_transformers import SentenceTransformer
from langchain_openai import ChatOpenAI

print("🚀 Task 5: Complete RAG Pipeline")
print("=" * 50)

# Initialize all components
client_db = chromadb.PersistentClient(path="./chroma_db")
collection = client_db.get_or_create_collection("techcorp_rag")
model = SentenceTransformer("all-MiniLM-L6-v2")

api_base = os.getenv("OPENAI_API_BASE")
api_key = os.getenv("OPENAI_API_KEY")
client_llm = ChatOpenAI(
    api_key=api_key,
    base_url=api_base,
    model="openai/gpt-4.1-mini",
    temperature=0.3,
    max_tokens=500
)

print("✅ All components loaded")

def rag_pipeline(user_question):
    """Complete RAG pipeline: Retrieve → Augment → Generate"""

    print(f"\n📝 Question: '{user_question}'")
    print("-" * 50)

    # Step 1: RETRIEVE
    print("1️⃣ RETRIEVE: Converting to embedding...")
    query_embedding = model.encode(user_question).tolist()

    #  1: Perform semantic search to find relevant chunks, top3
    # Hint: Use collection.query(query_embeddings=[...], n_results=3)
    results = collection.query(
        query_embeddings=[query_embedding],  # Replace ___ with query_embedding
        n_results=3  # Replace ___ with 3
    )

    retrieved_chunks = results['documents'][0]
    metadatas = results['metadatas'][0]

    print(f"   ✅ Retrieved {len(retrieved_chunks)} relevant chunks")
    for i, meta in enumerate(metadatas):
        print(f"      - {meta['source']} ({meta['section']})")

    # Step 2: AUGMENT
    print("\n2️⃣ AUGMENT: Building context...")

    #  2: Define system prompt for context-aware answers
    # Hint: Already complete - review the prompt below
    system_prompt = """You are TechCorp's helpful AI assistant.
Answer ONLY based on the provided context.
If the answer is not in the context, say: 'I don't have that information in the provided documents.'"""

    context_text = "Context from TechCorp documents:\n\n"
    for i, chunk in enumerate(retrieved_chunks, 1):
        context_text += f"[Document {i}]\n{chunk}\n\n"

    #  3: Complete the user prompt with question
    # Hint: Add user_question after "Question:"
    user_prompt = f"{context_text}\nQuestion: {user_question}\n\nAnswer:"  # Replace ___ with user_question

    print("   ✅ Context prepared with retrieved documents")

    # Step 3: GENERATE
    print("\n3️⃣ GENERATE: Creating answer...")

    #  4: Create messages for LLM with system and user prompts
    # Hint: Use system_prompt and user_prompt
    messages = [
        {"role": "system", "content": system_prompt},  # Replace ___ with system_prompt
        {"role": "user", "content": user_prompt}     # Replace ___ with user_prompt
    ]

    response = client_llm.invoke(messages)
    answer = response.content

    #  5: Format response with source citations
    # Hint: Use ', '.join(unique_sources) to list sources
    sources = [meta['source'] for meta in metadatas]
    unique_sources = list(set(sources))

    final_response = f"{answer}\n\n📎 Sources: {', '.join(unique_sources)}"  # Replace ___ with unique_sources

    return final_response

# Test the complete pipeline
def test_rag_pipeline():
    """Test with sample questions"""

    test_questions = [
        "Can I bring my dog to the office?",
        "How many vacation days do I get?",
        "What is the remote work policy?"
    ]

    for question in test_questions:
        answer = rag_pipeline(question)
        print("\n" + "=" * 50)
        print("💬 ANSWER:")
        print(answer)
        print("=" * 50)

# Run the test
try:
    # First ensure we have documents in the database
    if collection.count() == 0:
        print("\n⚠️ No documents in database. Please run Task 2 first!")
    else:
        print(f"\n📚 Database has {collection.count()} chunks ready")
        test_rag_pipeline()

        print("\n" + "=" * 50)
        print("🎉 RAG Pipeline Complete!")
        print("   - Retrieval: Semantic search working")
        print("   - Augmentation: Context injection ready")
        print("   - Generation: LLM producing answers")
        print("   - Citations: Sources included")
        print("=" * 50)

        # Create marker file
        os.makedirs("/root/markers", exist_ok=True)
        with open("/root/markers/task5_rag_complete.txt", "w") as f:
            f.write("TASK5_COMPLETE:RAG_PIPELINE_READY")

except Exception as e:
    print(f"\n❌ Error: {e}")

print("\n🎯 You've built a complete RAG system - from search to answers!")
print("\n✅ Task 5 completed!")


"""
🚀 Task 5: Complete RAG Pipeline
==================================================
✅ All components loaded

📚 Database has 327 chunks ready

📝 Question: 'Can I bring my dog to the office?'
--------------------------------------------------
1️⃣ RETRIEVE: Converting to embedding...
   ✅ Retrieved 3 relevant chunks
      - pet-policy.md (policies)
      - pet-policy.md (employee-handbook)
      - pet-policy.md (employee-handbook)

2️⃣ AUGMENT: Building context...
   ✅ Context prepared with retrieved documents

3️⃣ GENERATE: Creating answer...

==================================================
💬 ANSWER:
You can bring your dog to the office on Fridays, designated as "Furry Fridays," provided your dog is well-behaved, up-to-date on vaccinations, and has no history of aggression. You must register your dog with HR before the first visit by providing proof of vaccinations, a behavioral assessment form, and emergency contact information. Additionally, dogs are allowed only in open office areas, designated pet zones, and outdoor spaces—not in the cafeteria, conference rooms, or server rooms.

📎 Sources: pet-policy.md
==================================================

📝 Question: 'How many vacation days do I get?'
--------------------------------------------------
1️⃣ RETRIEVE: Converting to embedding...
   ✅ Retrieved 3 relevant chunks
      - vacation.md (policies)
      - vacation.md (policies)
      - vacation.md (policies)

2️⃣ AUGMENT: Building context...
   ✅ Context prepared with retrieved documents

3️⃣ GENERATE: Creating answer...

==================================================
💬 ANSWER:
You receive 20 days of paid vacation per year as a full-time employee.

📎 Sources: vacation.md
==================================================

📝 Question: 'What is the remote work policy?'
--------------------------------------------------
1️⃣ RETRIEVE: Converting to embedding...
   ✅ Retrieved 3 relevant chunks
      - remote-work-policy.md (employee-handbook)
      - remote-work.md (policies)
      - remote-work-policy.md (employee-handbook)

2️⃣ AUGMENT: Building context...
   ✅ Context prepared with retrieved documents

3️⃣ GENERATE: Creating answer...

==================================================
💬 ANSWER:
TechCorp's remote work policy embraces flexible work arrangements to promote work-life balance and productivity. It outlines a hybrid work model and remote work guidelines. During emergency situations such as weather or health emergencies, 100% remote work may be authorized, with essential personnel notified separately and the business continuity plan activated.

📎 Sources: remote-work.md, remote-work-policy.md
==================================================

==================================================
🎉 RAG Pipeline Complete!
   - Retrieval: Semantic search working
   - Augmentation: Context injection ready
   - Generation: LLM producing answers
   - Citations: Sources included
==================================================

🎯 You've built a complete RAG system - from search to answers!
"""