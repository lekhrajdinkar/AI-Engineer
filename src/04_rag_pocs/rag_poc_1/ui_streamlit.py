import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import streamlit as st
from src.AIModule.poc_2_rag.dynamo_client import get_all_chunks
from src.AIModule.poc_2_rag.embedder import embed_text
from src.AIModule.poc_2_rag.query_engine import get_top_chunks, query_foundation_model

st.title("🔎 GenAI RAG Search Engine")
user_question = st.text_input("Ask your question:")

if user_question:
    # need to run only once
    # python -m src.AIModule.poc_1_rag.rag_ingest
    #with st.spinner("Embedding question..."):
        #query_emb = embed_text(user_question)

    with st.spinner("Retrieving chunks from DynamoDB..."):
        chunks = get_all_chunks()  # [{doc_id, chunk_id, text, embedding, source}, ...]

    with st.spinner("Selecting relevant chunks..."):
        top_chunks = chunks
        #top_chunks = get_top_chunks(query_emb, chunks, top_k=3)
        context = "\n".join([c["text"] for c in top_chunks])

    with st.spinner("Querying Foundation Model..."):
        answer = query_foundation_model(context, user_question)

    st.subheader("Answer:")
    st.markdown(answer)

    with st.expander("📚 Retrieved Context Chunks"):
        for c in top_chunks:
            st.markdown(f"**Chunk ID**: {c['SK']}")
            st.markdown(c["text"])
            st.markdown(c["PK"])
            st.markdown("---")
