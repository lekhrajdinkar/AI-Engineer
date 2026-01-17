import streamlit as st
import boto3
import json
import numpy as np
from botocore.config import Config
from src.AIModule.poc_2_rag.dynamo_client import get_all_chunks
from src.AIModule.poc_2_rag.embedder import embed_text

BEDROCK_REGION = "us-east-1"
MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"
MODEL_VERSION = "bedrock-2023-05-31"

bedrock_runtime = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION, config=Config(read_timeout=60))

def query_foundation_model(context, question):
    prompt = f"""
Human: Use the context below to answer the question.
Context: {context}
Question: {question}
Assistant:"""

    messages = [
        {
            "role": "user",
            "content": prompt
        }
    ]

    body = json.dumps({
        #"prompt": prompt,
        "messages": messages,
        "anthropic_version": MODEL_VERSION,
        "max_tokens": 300,
        "temperature": 0.7,
        "top_k": 250,
        "top_p": 0.9,
        "stop_sequences": ["\n\nHuman:"]
    })

    response = bedrock_runtime.invoke_model(
        body=body,
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json"
    )

    response_body = json.loads(response['body'].read())
    print("response_body", response_body)
    #return response_body.get("completion", "No response.")
    return response_body

def get_top_chunks(query_embedding, all_chunks, top_k=3):
    for chunk in all_chunks:
        chunk["score"] = cosine_similarity(query_embedding, chunk["embedding"])
    sorted_chunks = sorted(all_chunks, key=lambda x: x["score"], reverse=True)
    return sorted_chunks[:top_k]

def cosine_similarity(vec1, vec2):
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))