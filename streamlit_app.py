import boto3
import json

import streamlit as st
MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"
MODEL_VERSION = "bedrock-2023-05-31"
region= "us-east-1"

education_prompt_1 = """
You are a helpful financial educator who explains concepts clearly and simply.
Explain the following investment concept in a way that's easy for a beginner to understand:
Question: {question}
Explain clearly, without jargon. Use examples if helpful.
"""

def call_claude(question: str, max_tokens: int = 400, temperature: float = 0.7) -> str:
    messages = [
        {"role": "user", "content": education_prompt_1.format(question=question)}
    ]

    client = boto3.client("bedrock-runtime", region_name=region)
    response = client.invoke_model(
        modelId="anthropic.claude-3-sonnet-20240229-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }),
        contentType="application/json",
        accept="application/json"
    )

    response_body = response["body"].read()
    parsed = json.loads(response_body)

    try:
        content_parts = parsed["content"]
        if isinstance(content_parts, list):
            return "".join(part.get("text", "") for part in content_parts).strip()
        else:
            return str(content_parts).strip()
    except KeyError:
        return parsed.get("message", "No content returned by Claude.").strip()



st.title("📊 Investor Education Chatbot")
st.markdown("Ask any investment-related question below:")

st.sidebar.header("🔧 Model Settings")
st.sidebar.markdown(f"**Model ID:** `{MODEL_ID}`")
st.sidebar.markdown(f"**Version:** `{MODEL_VERSION}`")

question = st.text_input("Your Question")

col1, col2 = st.columns(2)
max_tokens = col1.number_input("Max Tokens", min_value=10, max_value=1000, value=100, step=10)
temperature = col2.slider("Temperature", min_value=0.0, max_value=1.0, value=0.7, step=0.1)

st.markdown("---")
st.subheader("📄 Prompt Template Being Used")
st.code(education_prompt_1, language="text")

if question:
    with st.spinner("Thinking..."):
        response = call_claude(question, max_tokens=max_tokens, temperature=temperature)
        st.success(response)

