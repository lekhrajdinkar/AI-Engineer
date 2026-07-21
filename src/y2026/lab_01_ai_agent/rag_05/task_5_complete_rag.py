#!/usr/bin/env python3

from sympy import false
from src.y2026.lab_01_ai_agent.rag_05.task_1_setup_vectorstore import init_vector_store
from src.y2026.lab_01_ai_agent.rag_05.task_3_llm_integration import initialize_llm_and_test

def rag_pipeline(user_question):
    """Complete RAG pipeline: Retrieve → Augment → Generate"""

    print("-" * 50);    print("▶️ INIT")
    chroma_collection, embed_model = init_vector_store()
    print(f"\n📚 Database has {chroma_collection.count()} chunks ready")
    llm = initialize_llm_and_test(false)
    print("-- All components loaded")
    print(f"\n📝 Question: '{user_question}'")


    print("-" * 50);    print("1️⃣ RETRIEVE")
    query_embedding = embed_model.encode(user_question).tolist()
    results = chroma_collection.query(
        query_embeddings=[query_embedding],
        n_results=3
    )
    retrieved_chunks = results['documents'][0]
    metadatas = results['metadatas'][0]

    print(f" Retrieved {len(retrieved_chunks)} relevant chunks")
    for i, meta in enumerate(metadatas):
        print(f"      - {meta['source']} ({meta['section']})")



    print("-" * 50); print("2️⃣ AUGMENT")
    system_prompt = """
    You are TechCorp's helpful AI assistant.
    Answer ONLY based on the provided context.
    If the answer is not in the context, say: 'I don't have that information in the provided documents.'"""

    context_text = "Context from TechCorp documents:\n\n"
    for i, chunk in enumerate(retrieved_chunks, 1):
        context_text += f"[Document {i}]\n{chunk}\n\n"

    user_prompt = f"{context_text}\nQuestion: {user_question}\n\nAnswer:"
    print(f"Augmented user_prompt {user_prompt}")



    print("-" * 50); print("3️⃣ GENERATE")
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    response = llm.invoke(messages)
    answer = response.content

    sources = [meta['source'] for meta in metadatas]
    unique_sources = list(set(sources))
    final_response = f"{answer}\n\n📎 Sources: {', '.join(unique_sources)}"

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