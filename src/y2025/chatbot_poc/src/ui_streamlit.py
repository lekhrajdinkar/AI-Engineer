import sys
import os
# Add project root (one level above src) to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import streamlit as st
from src.AIModule.poc_1.bedrock_client import call_claude, MODEL_ID, MODEL_VERSION, load_topic_context
from src.AIModule.poc_1.prompt_template import education_prompt_1, education_prompt

st.title("📊 Investor Education Chatbot")
st.markdown("Ask any investment-related question below:")

st.sidebar.header("🔧 Model Settings")
st.sidebar.markdown(f"**Model ID:** `{MODEL_ID}`")
st.sidebar.markdown(f"**Version:** `{MODEL_VERSION}`")
st.sidebar.markdown("---")
st.sidebar.header("🔗 Useful Links")
st.sidebar.markdown("[Personal Website](https://lekhrajdinkar.netlify.app/)")

question = st.text_input("Your Question")

col1, col2 = st.columns(2)
max_tokens = col1.number_input("Max Tokens", min_value=10, max_value=1000, value=100, step=10)
temperature = col2.slider("Temperature", min_value=0.0, max_value=1.0, value=0.7, step=0.1)

context = load_topic_context()
with st.expander("📘 prompt engineering Details"):
    st.subheader("✅ context being Used")
    st.markdown(context)
    st.subheader("✅ Prompt Template being Used")
    st.code(education_prompt_1, language="text")

if question:
    with st.spinner("Thinking..."):
        response = call_claude(question, max_tokens=max_tokens, temperature=temperature)
        st.success(response)