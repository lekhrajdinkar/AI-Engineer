import os
from src.AIModule.poc_2_rag.embedder import embed_text
from src.AIModule.poc_2_rag.dynamo_client import save_chunk
from src.AIModule.poc_2_rag.s3_client import upload_file
import uuid

DOC_DIR = "src/AIModule/poc_2_rag/sample_docs"

def ingest_documents():
    for filename in os.listdir(DOC_DIR):
        path = os.path.join(DOC_DIR, filename)
        if filename.endswith(".md") or filename.endswith(".txt"):
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            doc_id = str(uuid.uuid4())
            chunks = chunk_text(content) # ⬅️
            embeddings = embed_text(chunks) # ⬅️
            #print(f'\nchunks :: {chunks} \n embeddings :: {embeddings}')

            for i, (text, vector) in enumerate(zip(chunks, embeddings)):
                #print(f'\ndoc_id : {doc_id} \ni : {i} \ntext : {text} \nvector : {vector} \nfilename : {filename}')
                save_chunk(doc_id, i, text, vector, filename)

            upload_file(path, filename)
            print(f"✅ Ingested {filename} as {doc_id}")

def chunk_text(text: str, max_tokens=200) -> list[str]:
    import textwrap
    return textwrap.wrap(text, width=max_tokens)

# python -m src.AIModule.poc_2_rag.rag_ingest
if __name__ == "__main__":
    ingest_documents()

